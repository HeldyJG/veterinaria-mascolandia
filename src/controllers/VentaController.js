const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/database');
const { Venta, VentaDetalle, Producto, Cliente, Usuario } = require('../models');
const { isModalRequest, redirectAfterSave } = require('../utils/modalHelpers');

const REGISTROS_POR_PAGINA = 20;
const PREFIJOS_COMPROBANTE = { TICKET: 'T', BOLETA: 'B', FACTURA: 'F' };

class VentaController {
  static async generarNumeroComprobante(tipoComprobante, transaction) {
    const prefijo = PREFIJOS_COMPROBANTE[tipoComprobante];
    const ultima = await Venta.findOne({
      where: {
        tipoComprobante,
        numeroComprobante: { [Op.like]: `${prefijo}-%` },
      },
      order: [['id', 'DESC']],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    let siguiente = 1;
    if (ultima?.numeroComprobante) {
      const partes = ultima.numeroComprobante.split('-');
      const numero = parseInt(partes[partes.length - 1], 10);
      if (!Number.isNaN(numero)) siguiente = numero + 1;
    }

    return `${prefijo}-${String(siguiente).padStart(6, '0')}`;
  }

  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const metodoPago = req.query.metodoPago || '';
      const estado = req.query.estado || '';
      const fechaDesde = req.query.fechaDesde || '';
      const fechaHasta = req.query.fechaHasta || '';
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = {};

      if (metodoPago) whereClause.metodoPago = metodoPago;
      if (estado) whereClause.estado = estado;

      if (fechaDesde && fechaHasta) {
        whereClause.fechaVenta = {
          [Op.between]: [new Date(`${fechaDesde}T00:00:00`), new Date(`${fechaHasta}T23:59:59`)],
        };
      } else if (fechaDesde) {
        whereClause.fechaVenta = { [Op.gte]: new Date(`${fechaDesde}T00:00:00`) };
      } else if (fechaHasta) {
        whereClause.fechaVenta = { [Op.lte]: new Date(`${fechaHasta}T23:59:59`) };
      }

      if (busqueda) {
        whereClause[Op.or] = [
          { numeroComprobante: { [Op.iLike]: `%${busqueda}%` } },
          { '$cliente.nombre_completo$': { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      const { count, rows: ventas } = await Venta.findAndCountAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        ],
        order: [['fechaVenta', 'DESC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      const clientes = await Cliente.findAll({
        where: { estado: 1 },
        attributes: ['id', 'nombreCompleto', 'dni'],
        order: [['nombreCompleto', 'ASC']],
      });

      res.render('ventas/index', {
        title: 'Ventas | Mascolandia',
        pageTitle: 'Punto de Venta — Historial',
        activePage: '/ventas',
        ventas,
        busqueda,
        metodoPago,
        estado,
        fechaDesde,
        fechaHasta,
        pagina,
        totalPaginas,
        totalRegistros: count,
        clientes,
      });
    } catch (error) {
      console.error('Error al listar ventas:', error);
      req.flash('error', 'Error al cargar el listado de ventas.');
      res.redirect('/dashboard');
    }
  }

  static async create(req, res) {
    return res.redirect('/ventas?modal=modal-crear-venta');
  }

  static async store(req, res) {
    const items = req.productosVenta || [];
    const idUsuario = req.session.usuario.id;
    const idCliente = req.body.idCliente ? parseInt(req.body.idCliente, 10) : null;
    const tipoComprobante = req.body.tipoComprobante;
    const metodoPago = req.body.metodoPago;

    const transaction = await sequelize.transaction();

    try {
      const productosMap = new Map();

      for (const item of items) {
        const idProducto = parseInt(item.idProducto, 10);

        if (productosMap.has(idProducto)) {
          const existente = productosMap.get(idProducto);
          existente.cantidad += parseInt(item.cantidad, 10);
        } else {
          productosMap.set(idProducto, {
            idProducto,
            cantidad: parseInt(item.cantidad, 10),
            precioUnitario: parseFloat(item.precioUnitario),
          });
        }
      }

      const lineas = [];
      let total = 0;

      for (const linea of productosMap.values()) {
        const producto = await Producto.findOne({
          where: { id: linea.idProducto, estado: 1 },
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });

        if (!producto) {
          throw new Error(`El producto #${linea.idProducto} no existe o no está activo.`);
        }

        if (producto.stockActual < linea.cantidad) {
          throw new Error(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stockActual}, solicitado: ${linea.cantidad}.`
          );
        }

        const precioUnitario = parseFloat(producto.precioVenta);
        const subtotal = precioUnitario * linea.cantidad;
        total += subtotal;

        lineas.push({
          producto,
          cantidad: linea.cantidad,
          precioUnitario,
          subtotal,
        });
      }

      const numeroComprobante = await VentaController.generarNumeroComprobante(
        tipoComprobante,
        transaction
      );

      const venta = await Venta.create(
        {
          idCliente,
          idUsuario,
          tipoComprobante,
          numeroComprobante,
          metodoPago,
          total: total.toFixed(2),
          estado: 'COMPLETADA',
          fechaVenta: new Date(),
        },
        { transaction }
      );

      for (const linea of lineas) {
        await VentaDetalle.create(
          {
            idVenta: venta.id,
            idProducto: linea.producto.id,
            cantidad: linea.cantidad,
            precioUnitario: linea.precioUnitario,
            subtotal: linea.subtotal.toFixed(2),
          },
          { transaction }
        );

        await linea.producto.update(
          { stockActual: linea.producto.stockActual - linea.cantidad },
          { transaction }
        );
      }

      await transaction.commit();

      req.flash('success', `Venta ${numeroComprobante} registrada correctamente.`);
      res.redirect(`/ventas/${venta.id}`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error al registrar venta:', error);
      req.flash('error', error.message || 'Error al registrar la venta. Intente nuevamente.');
      res.redirect('/ventas/crear');
    }
  }

  static async show(req, res) {
    try {
      const venta = await Venta.findByPk(req.params.id, {
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
          {
            model: VentaDetalle,
            as: 'detalles',
            include: [{ model: Producto, as: 'producto' }],
          },
        ],
      });

      if (!venta) {
        req.flash('error', 'Venta no encontrada.');
        return res.redirect('/ventas');
      }

      res.render('ventas/show', {
        title: `Venta ${venta.numeroComprobante || venta.id} | Mascolandia`,
        pageTitle: 'Detalle de Venta',
        activePage: '/ventas',
        venta,
      });
    } catch (error) {
      console.error('Error al mostrar venta:', error);
      req.flash('error', 'Error al cargar el detalle de la venta.');
      res.redirect('/ventas');
    }
  }

  static async imprimir(req, res) {
    try {
      const venta = await Venta.findByPk(req.params.id, {
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
          {
            model: VentaDetalle,
            as: 'detalles',
            include: [{ model: Producto, as: 'producto' }],
          },
        ],
      });

      if (!venta) {
        req.flash('error', 'Venta no encontrada.');
        return res.redirect('/ventas');
      }

      res.render('ventas/imprimir', {
        title: `Comprobante ${venta.numeroComprobante || venta.id}`,
        venta,
        layout: false,
      });
    } catch (error) {
      console.error('Error al imprimir venta:', error);
      req.flash('error', 'Error al generar el comprobante.');
      res.redirect('/ventas');
    }
  }

  static async anular(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const venta = await Venta.findByPk(req.params.id, {
        include: [{ model: VentaDetalle, as: 'detalles' }],
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!venta) {
        await transaction.rollback();
        req.flash('error', 'Venta no encontrada.');
        return res.redirect('/ventas');
      }

      if (venta.estado === 'ANULADA') {
        await transaction.rollback();
        req.flash('error', 'Esta venta ya está anulada.');
        return res.redirect(`/ventas/${venta.id}`);
      }

      for (const detalle of venta.detalles) {
        const producto = await Producto.findByPk(detalle.idProducto, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });

        if (producto) {
          await producto.update(
            { stockActual: producto.stockActual + detalle.cantidad },
            { transaction }
          );
        }
      }

      await venta.update({ estado: 'ANULADA' }, { transaction });
      await transaction.commit();

      req.flash('success', `Venta ${venta.numeroComprobante || venta.id} anulada. Stock restaurado.`);
      redirectAfterSave(req, res, '/ventas', `/ventas/${venta.id}`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error al anular venta:', error);
      req.flash('error', 'Error al anular la venta. Intente nuevamente.');
      res.redirect('back');
    }
  }

  static async modal(req, res) {
    try {
      const { id } = req.params;
      const vista = req.query.vista || 'ver';

      if (!isModalRequest(req)) {
        return res.redirect(`/ventas/${id}`);
      }

      if (vista !== 'ver') {
        return res.status(400).send('Vista no válida');
      }

      const venta = await Venta.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
          {
            model: VentaDetalle,
            as: 'detalles',
            include: [{ model: Producto, as: 'producto' }],
          },
        ],
      });

      if (!venta) {
        return res.status(404).send('Venta no encontrada');
      }

      return res.render('partials/modals/fragments/venta-ver', { venta, layout: false });
    } catch (error) {
      console.error('Error modal venta:', error);
      return res.status(500).send('Error al cargar el modal');
    }
  }
}

module.exports = VentaController;
