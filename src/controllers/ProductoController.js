const { Op } = require('sequelize');
const { Producto, CategoriaProducto, Proveedor, VentaDetalle } = require('../models');
const { isModalRequest, redirectAfterSave } = require('../utils/modalHelpers');

const REGISTROS_POR_PAGINA = 20;

/**
 * Calcula el estado de stock de un producto.
 * @param {number} stockActual
 * @param {number} stockMinimo
 * @returns {'SIN_STOCK'|'STOCK_BAJO'|'STOCK_OK'}
 */
function calcularEstadoStock(stockActual, stockMinimo) {
  if (stockActual === 0) return 'SIN_STOCK';
  if (stockActual <= stockMinimo) return 'STOCK_BAJO';
  return 'STOCK_OK';
}

class ProductoController {
  /**
   * GET /productos
   * Lista productos con alertas de stock, filtros por categoría/proveedor y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const idCategoria = req.query.idCategoria || '';
      const idProveedor = req.query.idProveedor || '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = { estado: 1 };

      if (busqueda) {
        whereClause[Op.or] = [
          { nombre: { [Op.iLike]: `%${busqueda}%` } },
          { codigoBarras: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      if (idCategoria) {
        whereClause.idCategoria = idCategoria;
      }

      if (idProveedor) {
        whereClause.idProveedor = idProveedor;
      }

      const { count, rows: productos } = await Producto.findAndCountAll({
        where: whereClause,
        include: [
          { model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] },
          { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombreEmpresa'] },
        ],
        order: [['nombre', 'ASC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      // Agregar estado de stock a cada producto
      const productosConStock = productos.map((p) => {
        const data = p.toJSON();
        data.estadoStock = calcularEstadoStock(data.stockActual, data.stockMinimo);
        return data;
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      // Cargar categorías y proveedores para los filtros
      const [categorias, proveedores] = await Promise.all([
        CategoriaProducto.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        Proveedor.findAll({ where: { estado: 1 }, order: [['nombreEmpresa', 'ASC']] }),
      ]);

      res.render('productos/index', {
        title: 'Productos | Mascolandia',
        pageTitle: 'Gestión de Productos',
        activePage: '/productos',
        productos: productosConStock,
        busqueda,
        idCategoria,
        idProveedor,
        categorias,
        proveedores,
        pagina,
        totalPaginas,
        totalRegistros: count,
      });
    } catch (error) {
      console.error('Error al listar productos:', error);
      req.flash('error', 'Error al cargar la lista de productos.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /productos/crear
   * Renderiza el formulario de creación con categorías y proveedores activos.
   */
  static async create(req, res) {
    return res.redirect('/productos?modal=modal-crear-producto');
  }

  /**
   * POST /productos
   * Guarda un nuevo producto. La validación de código de barras único se maneja en el validator.
   */
  static async store(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const {
        codigoBarras,
        nombre,
        descripcion,
        idCategoria,
        idProveedor,
        precioCompra,
        precioVenta,
        stockActual,
        stockMinimo,
      } = req.body;

      await Producto.create({
        codigoBarras: codigoBarras ? codigoBarras.trim() : null,
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        idCategoria: idCategoria || null,
        idProveedor: idProveedor || null,
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        stockActual: parseInt(stockActual, 10),
        stockMinimo: parseInt(stockMinimo, 10),
        estado: 1,
      });

      if (isAjax) {
        return res.json({ success: true, message: 'Producto registrado correctamente.' });
      }

      req.flash('success', 'Producto registrado correctamente.');
      res.redirect('/productos');
    } catch (error) {
      console.error('Error al crear producto:', error);
      if (isAjax) {
        return res.status(500).json({ success: false, errors: ['Error al registrar el producto. Intente nuevamente.'] });
      }
      req.flash('error', 'Error al registrar el producto. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * GET /productos/:id
   * Muestra el detalle de un producto.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const producto = await Producto.findOne({
        where: { id, estado: 1 },
        include: [
          { model: CategoriaProducto, as: 'categoria' },
          { model: Proveedor, as: 'proveedor' },
        ],
      });

      if (!producto) {
        req.flash('error', 'Producto no encontrado.');
        return res.redirect('/productos');
      }

      const data = producto.toJSON();
      data.estadoStock = calcularEstadoStock(data.stockActual, data.stockMinimo);

      res.render('productos/show', {
        title: `${producto.nombre} | Mascolandia`,
        pageTitle: 'Detalle del Producto',
        activePage: '/productos',
        producto: data,
      });
    } catch (error) {
      console.error('Error al mostrar producto:', error);
      req.flash('error', 'Error al cargar los datos del producto.');
      res.redirect('/productos');
    }
  }

  /**
   * GET /productos/:id/editar
   * Renderiza el formulario de edición con categorías y proveedores activos.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const [producto, categorias, proveedores] = await Promise.all([
        Producto.findOne({ where: { id, estado: 1 } }),
        CategoriaProducto.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        Proveedor.findAll({ where: { estado: 1 }, order: [['nombreEmpresa', 'ASC']] }),
      ]);

      if (!producto) {
        req.flash('error', 'Producto no encontrado.');
        return res.redirect('/productos');
      }

      res.render('productos/edit', {
        title: `Editar Producto | Mascolandia`,
        pageTitle: 'Editar Producto',
        activePage: '/productos',
        producto,
        categorias,
        proveedores,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición de producto:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/productos');
    }
  }

  /**
   * PUT /productos/:id
   * Actualiza los datos de un producto. La validación de código de barras único se maneja en el validator.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        codigoBarras,
        nombre,
        descripcion,
        idCategoria,
        idProveedor,
        precioCompra,
        precioVenta,
        stockActual,
        stockMinimo,
      } = req.body;

      const producto = await Producto.findOne({ where: { id, estado: 1 } });

      if (!producto) {
        req.flash('error', 'Producto no encontrado.');
        return res.redirect('/productos');
      }

      await producto.update({
        codigoBarras: codigoBarras ? codigoBarras.trim() : null,
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        idCategoria: idCategoria || null,
        idProveedor: idProveedor || null,
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        stockActual: parseInt(stockActual, 10),
        stockMinimo: parseInt(stockMinimo, 10),
      });

      req.flash('success', 'Producto actualizado correctamente.');
      redirectAfterSave(req, res, '/productos', `/productos/${id}`);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      req.flash('error', 'Error al actualizar el producto. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /productos/:id
   * Soft delete: establece estado = 0.
   * Valida que no tenga VentaDetalle asociados antes de eliminar.
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const producto = await Producto.findOne({ where: { id, estado: 1 } });

      if (!producto) {
        req.flash('error', 'Producto no encontrado.');
        return res.redirect('/productos');
      }

      // Verificar que no tenga ventas asociadas
      const ventasAsociadas = await VentaDetalle.count({
        where: { idProducto: id },
      });

      if (ventasAsociadas > 0) {
        req.flash(
          'error',
          `No se puede eliminar el producto porque tiene ${ventasAsociadas} venta(s) asociada(s).`
        );
        return res.redirect('/productos');
      }

      await producto.update({ estado: 0 });

      req.flash('success', 'Producto eliminado correctamente.');
      res.redirect('/productos');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      req.flash('error', 'Error al eliminar el producto. Intente nuevamente.');
      res.redirect('/productos');
    }
  }

  /**
   * PUT /productos/:id/stock
   * Ajuste manual de inventario.
   * Body: { cantidad, tipo: 'ENTRADA'|'SALIDA', motivo }
   */
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { cantidad, tipo, motivo } = req.body;

      const producto = await Producto.findOne({ where: { id, estado: 1 } });

      if (!producto) {
        req.flash('error', 'Producto no encontrado.');
        return res.redirect('/productos');
      }

      const cantidadNum = parseInt(cantidad, 10);

      if (isNaN(cantidadNum) || cantidadNum <= 0) {
        req.flash('error', 'La cantidad debe ser un número entero mayor a 0.');
        return res.redirect(`/productos/${id}`);
      }

      if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
        req.flash('error', 'El tipo de ajuste debe ser ENTRADA o SALIDA.');
        return res.redirect(`/productos/${id}`);
      }

      let nuevoStock;
      if (tipo === 'ENTRADA') {
        nuevoStock = producto.stockActual + cantidadNum;
      } else {
        nuevoStock = producto.stockActual - cantidadNum;
        if (nuevoStock < 0) {
          req.flash('error', 'No hay suficiente stock para realizar la salida.');
          return res.redirect(`/productos/${id}`);
        }
      }

      await producto.update({ stockActual: nuevoStock });

      const estadoStock = calcularEstadoStock(nuevoStock, producto.stockMinimo);
      const tipoLabel = tipo === 'ENTRADA' ? 'entrada' : 'salida';
      req.flash(
        'success',
        `Stock actualizado correctamente. Se registró una ${tipoLabel} de ${cantidadNum} unidad(es). Stock actual: ${nuevoStock} (${estadoStock}).`
      );
      res.redirect(`/productos/${id}`);
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      req.flash('error', 'Error al actualizar el stock. Intente nuevamente.');
      res.redirect('back');
    }
  }

  static async modal(req, res) {
    try {
      const { id } = req.params;
      const vista = req.query.vista;

      if (!isModalRequest(req)) {
        return res.redirect(vista === 'editar' ? `/productos/${id}/editar` : `/productos/${id}`);
      }

      if (!['ver', 'editar'].includes(vista)) {
        return res.status(400).send('Vista no válida');
      }

      const row = await Producto.findOne({
        where: { id, estado: 1 },
        include: [
          { model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] },
          { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombreEmpresa'] },
        ],
      });

      if (!row) {
        return res.status(404).send('Producto no encontrado');
      }

      const producto = row.toJSON();
      producto.estadoStock = calcularEstadoStock(producto.stockActual, producto.stockMinimo);

      let categorias = [];
      let proveedores = [];

      if (vista === 'editar') {
        [categorias, proveedores] = await Promise.all([
          CategoriaProducto.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
          Proveedor.findAll({ where: { estado: 1 }, order: [['nombreEmpresa', 'ASC']] }),
        ]);
      }

      return res.render(`partials/modals/fragments/producto-${vista}`, {
        producto,
        categorias,
        proveedores,
        layout: false,
      });
    } catch (error) {
      console.error('Error modal producto:', error);
      return res.status(500).send('Error al cargar el modal');
    }
  }

  /**
   * GET /api/productos/buscar?q=texto
   * API JSON para punto de venta. Busca por nombre o código de barras.
   * Devuelve: { success: true, data: [{ id, nombre, precioVenta, stockActual, codigoBarras }] }
   */
  static async buscar(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';

      if (!q) {
        return res.json({ success: true, data: [] });
      }

      const productos = await Producto.findAll({
        where: {
          estado: 1,
          [Op.or]: [
            { nombre: { [Op.iLike]: `%${q}%` } },
            { codigoBarras: { [Op.iLike]: `%${q}%` } },
          ],
        },
        attributes: ['id', 'nombre', 'precioVenta', 'stockActual', 'codigoBarras'],
        order: [['nombre', 'ASC']],
        limit: 20,
      });

      return res.json({ success: true, data: productos });
    } catch (error) {
      console.error('Error en búsqueda de productos:', error);
      return res.status(500).json({ success: false, message: 'Error al buscar productos.' });
    }
  }
}

module.exports = ProductoController;
