const { Op, fn, col } = require('sequelize');
const { Servicio, Cita } = require('../models');
const { ejecutarValidacion } = require('../middlewares/validators/validatorHelper');

const REGISTROS_POR_PAGINA = 20;

class ServicioController {
  /**
   * GET /servicios
   * Lista servicios con búsqueda y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = { estado: 1 };

      if (busqueda) {
        whereClause[Op.or] = [
          { nombre: { [Op.iLike]: `%${busqueda}%` } },
          { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      const { count, rows: servicios } = await Servicio.findAndCountAll({
        where: whereClause,
        order: [['nombre', 'ASC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      // Contar citas por servicio para mostrar en la tabla
      const citasPorServicio = await Cita.findAll({
        attributes: ['idServicio', [fn('COUNT', col('id')), 'total']],
        where: { idServicio: servicios.map((s) => s.id) },
        group: ['idServicio'],
        raw: true,
      });

      const citasMap = {};
      citasPorServicio.forEach((r) => {
        citasMap[r.idServicio] = parseInt(r.total, 10);
      });

      const serviciosConCitas = servicios.map((s) => {
        const data = s.toJSON();
        data.totalCitas = citasMap[s.id] || 0;
        return data;
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      res.render('servicios/index', {
        title: 'Servicios | Mascolandia',
        pageTitle: 'Gestión de Servicios',
        activePage: '/servicios',
        servicios: serviciosConCitas,
        busqueda,
        pagina,
        totalPaginas,
        totalRegistros: count,
      });
    } catch (error) {
      console.error('Error al listar servicios:', error);
      req.flash('error', 'Error al cargar la lista de servicios.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /servicios/crear
   */
  static async create(req, res) {
    res.render('servicios/create', {
      title: 'Nuevo Servicio | Mascolandia',
      pageTitle: 'Registrar Nuevo Servicio',
      activePage: '/servicios',
    });
  }

  /**
   * POST /servicios
   */
  static async store(req, res) {
    try {
      const { nombre, descripcion, precio, duracionMinutos } = req.body;

      await Servicio.create({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos, 10) : null,
        estado: 1,
      });

      req.flash('success', 'Servicio registrado correctamente.');
      res.redirect('/servicios');
    } catch (error) {
      console.error('Error al crear servicio:', error);
      req.flash('error', 'Error al registrar el servicio. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * GET /servicios/:id
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      const totalCitas = await Cita.count({ where: { idServicio: id } });

      res.render('servicios/show', {
        title: `${servicio.nombre} | Mascolandia`,
        pageTitle: 'Detalle del Servicio',
        activePage: '/servicios',
        servicio,
        totalCitas,
      });
    } catch (error) {
      console.error('Error al mostrar servicio:', error);
      req.flash('error', 'Error al cargar los datos del servicio.');
      res.redirect('/servicios');
    }
  }

  /**
   * GET /servicios/:id/editar
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      res.render('servicios/edit', {
        title: `Editar Servicio | Mascolandia`,
        pageTitle: 'Editar Servicio',
        activePage: '/servicios',
        servicio,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/servicios');
    }
  }

  /**
   * PUT /servicios/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, precio, duracionMinutos } = req.body;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      await servicio.update({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos, 10) : null,
      });

      req.flash('success', 'Servicio actualizado correctamente.');
      res.redirect('/servicios');
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      req.flash('error', 'Error al actualizar el servicio. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /servicios/:id
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      // Verificar que no tenga citas activas
      const citasActivas = await Cita.count({
        where: {
          idServicio: id,
          estado: { [Op.in]: ['PENDIENTE', 'CONFIRMADA', 'EN_ESPERA'] },
        },
      });

      if (citasActivas > 0) {
        req.flash('error', `No se puede eliminar el servicio porque tiene ${citasActivas} cita(s) activa(s).`);
        return res.redirect('/servicios');
      }

      await servicio.update({ estado: 0 });

      req.flash('success', 'Servicio eliminado correctamente.');
      res.redirect('/servicios');
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      req.flash('error', 'Error al eliminar el servicio. Intente nuevamente.');
      res.redirect('/servicios');
    }
  }
}

module.exports = ServicioController;
