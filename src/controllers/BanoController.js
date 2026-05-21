const { Bano, BanoStock, Mascota, Usuario, Cita } = require('../models');
const sequelize = require('../config/database');

class BanoController {
  // Renderizar la vista principal
  static async mostrarPagina(req, res) {
    try {
      const hoyStr = new Date().toISOString().split('T')[0];

      const [usuarios, mascotas, banos, stock, hoyCount] = await Promise.all([
        Usuario.findAll({
          where: { estado: 1 },
          attributes: ['id', 'nombre'],
          order: [['nombre', 'ASC']],
        }),
        Mascota.findAll({
          where: { estado: 1 },
          attributes: ['id', 'nombre'],
          order: [['nombre', 'ASC']],
        }),
        Bano.findAll({
          order: [
            ['fecha', 'DESC'],
            ['id', 'DESC'],
          ],
          include: [
            { model: Mascota, as: 'mascota', attributes: ['id', 'nombre'] },
            { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
          ],
        }),
        BanoStock.findByPk(1),
        Bano.count({ where: { fecha: hoyStr } }),
      ]);

      let stockData = stock;
      if (!stockData) {
        stockData = await BanoStock.create({
          id: 1,
          acondicionadorActual: 3785.41,
          acondicionadorMax: 3785.41,
          shampooActual: 3785.41,
          shampooMax: 3785.41,
        });
      }

      res.render('baños', {
        title: 'Gestión de Baños y Peluquería | Mascolandia',
        pageTitle: 'Baños y Peluquería Estética',
        activePage: '/banos/listar',
        usuarios,
        mascotas,
        banos,
        stock: stockData,
        hoyCount,
        apiBase: '/banos',
      });
    } catch (error) {
      console.error('Error al mostrar página de baños:', error);
      req.flash('error', 'Error al cargar los datos de la página.');
      res.redirect('/dashboard');
    }
  }

  // API: Listar todos
  static async listarTodos(req, res) {
    try {
      const data = await Bano.findAll({
        order: [['fecha', 'DESC'], ['id', 'DESC']],
        include: [
          { model: Mascota, as: 'mascota' },
          { model: Usuario, as: 'usuario' },
        ],
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // API: Obtener por ID
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const bano = await Bano.findByPk(id, {
        include: [
          { model: Mascota, as: 'mascota' },
          { model: Usuario, as: 'usuario' },
        ],
      });
      if (!bano) {
        return res.status(404).json({ success: false, message: 'Registro no encontrado' });
      }
      res.json({ success: true, data: bano });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // API: Guardar / Editar con manejo transaccional de stock
  static async guardar(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const payload = req.body;
      const id = payload.id ? parseInt(payload.id) : null;

      const idMascota = parseInt(payload.idMascota);
      const idUsuario = parseInt(payload.idUsuario);
      const fecha = payload.fecha;
      const tipoServicio = payload.tipoServicio || null;
      const observaciones = payload.observaciones || null;
      const pesoMascota = payload.pesoMascota ? parseFloat(payload.pesoMascota) : null;
      const precio = payload.precio ? parseFloat(payload.precio) : null;
      const estado = payload.estado || 'PENDIENTE';
      const tamanoPerro = payload.tamanoPerro || null;
      const mlShampoo = payload.mlShampoo ? parseFloat(payload.mlShampoo) : 0;
      const mlAcondicionador = payload.mlAcondicionador ? parseFloat(payload.mlAcondicionador) : 0;

      let bano;
      let stock = await BanoStock.findByPk(1, { transaction });
      if (!stock) {
        stock = await BanoStock.create({
          id: 1,
          acondicionadorActual: 3785.41,
          acondicionadorMax: 3785.41,
          shampooActual: 3785.41,
          shampooMax: 3785.41,
        }, { transaction });
      }

      if (!id) {
        // NUEVO REGISTRO
        bano = await Bano.create({
          idMascota,
          idUsuario,
          fecha,
          tipoServicio,
          observaciones,
          pesoMascota,
          precio,
          estado,
          tamanoPerro,
          mlShampoo,
          mlAcondicionador,
        }, { transaction });

        // Si se crea en estado FINALIZADO -> Descontar stock
        if (estado === 'FINALIZADO') {
          stock.shampooActual = parseFloat(stock.shampooActual) - mlShampoo;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) - mlAcondicionador;
          await stock.save({ transaction });
        }
      } else {
        // EDICIÓN
        bano = await Bano.findByPk(id, { transaction });
        if (!bano) {
          throw new Error('El registro de baño no existe');
        }

        const estadoPrevio = bano.estado;
        const shampooPrevio = parseFloat(bano.mlShampoo || 0);
        const acondPrevio = parseFloat(bano.mlAcondicionador || 0);

        // Actualizar datos del baño
        bano.idMascota = idMascota;
        bano.idUsuario = idUsuario;
        bano.fecha = fecha;
        bano.tipoServicio = tipoServicio;
        bano.observaciones = observaciones;
        bano.pesoMascota = pesoMascota;
        bano.precio = precio;
        bano.estado = estado;
        bano.tamanoPerro = tamanoPerro;
        bano.mlShampoo = mlShampoo;
        bano.mlAcondicionador = mlAcondicionador;
        await bano.save({ transaction });

        const eraFinalizado = (estadoPrevio === 'FINALIZADO');
        const esFinalizado = (estado === 'FINALIZADO');

        if (!eraFinalizado && esFinalizado) {
          // De otro estado a FINALIZADO -> Descontar nuevo
          stock.shampooActual = parseFloat(stock.shampooActual) - mlShampoo;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) - mlAcondicionador;
          await stock.save({ transaction });
        } else if (eraFinalizado && !esFinalizado) {
          // De FINALIZADO a otro -> Devolver previo
          stock.shampooActual = parseFloat(stock.shampooActual) + shampooPrevio;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) + acondPrevio;
          await stock.save({ transaction });
        } else if (eraFinalizado && esFinalizado) {
          // Ajuste de mililitros
          const diffShampoo = mlShampoo - shampooPrevio;
          const diffAcond = mlAcondicionador - acondPrevio;
          
          stock.shampooActual = parseFloat(stock.shampooActual) - diffShampoo;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) - diffAcond;
          await stock.save({ transaction });
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Registro guardado correctamente', data: bano });
    } catch (error) {
      await transaction.rollback();
      console.error('Error al guardar baño:', error);
      res.status(500).json({ success: false, message: 'Error al guardar: ' + error.message });
    }
  }

  // API: Eliminar
  static async eliminar(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const bano = await Bano.findByPk(id, { transaction });
      if (!bano) {
        return res.status(404).json({ success: false, message: 'Registro no encontrado' });
      }

      if (bano.estado === 'FINALIZADO') {
        const stock = await BanoStock.findByPk(1, { transaction });
        if (stock) {
          stock.shampooActual = parseFloat(stock.shampooActual) + parseFloat(bano.mlShampoo || 0);
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) + parseFloat(bano.mlAcondicionador || 0);
          await stock.save({ transaction });
        }
      }

      await bano.destroy({ transaction });
      await transaction.commit();
      res.json({ success: true, message: 'Registro eliminado correctamente' });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: 'Error al eliminar: ' + error.message });
    }
  }

  // API: Stock e información adicional
  static async obtenerStock(req, res) {
    try {
      let stock = await BanoStock.findByPk(1);
      if (!stock) {
        stock = await BanoStock.create({
          id: 1,
          acondicionadorActual: 3785.41,
          acondicionadorMax: 3785.41,
          shampooActual: 3785.41,
          shampooMax: 3785.41,
        });
      }

      const hoyStr = new Date().toISOString().split('T')[0];
      const hoyCount = await Bano.count({ where: { fecha: hoyStr } });

      res.json({ success: true, data: stock, hoyCount });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // API: Reponer stock
  static async reponerStock(req, res) {
    try {
      const { tipo } = req.params;
      const stock = await BanoStock.findByPk(1);
      if (!stock) {
        return res.status(404).json({ success: false, message: 'Registro de stock no inicializado' });
      }

      if (tipo === 'shampoo') {
        stock.shampooActual = stock.shampooMax;
      } else if (tipo === 'acondicionador') {
        stock.acondicionadorActual = stock.acondicionadorMax;
      } else {
        return res.status(400).json({ success: false, message: 'Tipo no válido' });
      }

      await stock.save();
      res.json({ success: true, message: `Stock de ${tipo} repuesto correctamente`, data: stock });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // API: Cambiar estado (Play/Pause/Complete)
  static async cambiarEstado(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const bano = await Bano.findByPk(id, { transaction });
      if (!bano) {
        return res.status(404).json({ success: false, message: 'Registro no encontrado' });
      }

      const anterior = bano.estado;
      const nuevo = (anterior === 'FINALIZADO') ? 'EN_PROCESO' : 'FINALIZADO';
      
      const mlShampoo = parseFloat(bano.mlShampoo || 0);
      const mlAcond = parseFloat(bano.mlAcondicionador || 0);

      const stock = await BanoStock.findByPk(1, { transaction });
      if (stock) {
        if (anterior !== 'FINALIZADO' && nuevo === 'FINALIZADO') {
          stock.shampooActual = parseFloat(stock.shampooActual) - mlShampoo;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) - mlAcond;
        } else if (anterior === 'FINALIZADO' && nuevo !== 'FINALIZADO') {
          stock.shampooActual = parseFloat(stock.shampooActual) + mlShampoo;
          stock.acondicionadorActual = parseFloat(stock.acondicionadorActual) + mlAcond;
        }
        await stock.save({ transaction });
      }

      bano.estado = nuevo;
      await bano.save({ transaction });

      await transaction.commit();
      res.json({ success: true, message: 'Estado actualizado correctamente', data: bano });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: 'Error al cambiar estado: ' + error.message });
    }
  }
}

module.exports = BanoController;
