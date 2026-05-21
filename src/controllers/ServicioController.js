const { Op } = require('sequelize');
const { Servicio, Categoria } = require('../models');

const REGISTROS_POR_PAGINA = 20;

class ServicioController {
  /**
   * GET /servicios
   * Lista servicios con búsqueda (ILIKE) y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const categoria = req.query.categoria || '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = { estado: 1 };

      if (busqueda) {
        whereClause[Op.or] = [
          { nombre: { [Op.iLike]: `%${busqueda}%` } },
          { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      if (categoria) {
        whereClause.idCategoria = categoria;
      }

      const { count, rows: servicios } = await Servicio.findAndCountAll({
        where: whereClause,
        include: [{ model: Categoria, as: 'categoria' }],
        order: [['nombre', 'ASC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      const categorias = await Categoria.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      res.render('servicios/index', {
        title: 'Servicios | Mascolandia',
        pageTitle: 'Gestión de Servicios',
        activePage: '/servicios',
        servicios,
        categorias,
        busqueda,
        categoria,
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
   * Renderiza el formulario de creación.
   */
  static async create(req, res) {
    try {
      const categorias = await Categoria.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      res.render('servicios/create', {
        title: 'Nuevo Servicio | Mascolandia',
        pageTitle: 'Registrar Nuevo Servicio',
        activePage: '/servicios',
        categorias,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario.');
      res.redirect('/servicios');
    }
  }

  /**
   * POST /servicios
   * Guarda un nuevo servicio.
   */
  static async store(req, res) {
    try {
      const { nombre, descripcion, precio, duracionMinutos, idCategoria } = req.body;

      await Servicio.create({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos) : null,
        idCategoria: parseInt(idCategoria),
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
   * Muestra el detalle de un servicio.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({
        where: { id, estado: 1 },
        include: [{ model: Categoria, as: 'categoria' }],
      });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      res.render('servicios/show', {
        title: `${servicio.nombre} | Mascolandia`,
        pageTitle: 'Detalle del Servicio',
        activePage: '/servicios',
        servicio,
      });
    } catch (error) {
      console.error('Error al mostrar servicio:', error);
      req.flash('error', 'Error al cargar los datos del servicio.');
      res.redirect('/servicios');
    }
  }

  /**
   * GET /servicios/:id/editar
   * Renderiza el formulario de edición.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({
        where: { id, estado: 1 },
        include: [{ model: Categoria, as: 'categoria' }],
      });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      const categorias = await Categoria.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      res.render('servicios/edit', {
        title: `Editar Servicio | Mascolandia`,
        pageTitle: 'Editar Servicio',
        activePage: '/servicios',
        servicio,
        categorias,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/servicios');
    }
  }

  /**
   * PUT /servicios/:id
   * Actualiza los datos de un servicio.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, precio, duracionMinutos, idCategoria } = req.body;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
        return res.redirect('/servicios');
      }

      await servicio.update({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos) : null,
        idCategoria: parseInt(idCategoria),
      });

      req.flash('success', 'Servicio actualizado correctamente.');
      res.redirect(`/servicios/${id}`);
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      req.flash('error', 'Error al actualizar el servicio. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /servicios/:id
   * Soft delete: establece estado = 0 (no elimina físicamente).
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const servicio = await Servicio.findOne({ where: { id, estado: 1 } });

      if (!servicio) {
        req.flash('error', 'Servicio no encontrado.');
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