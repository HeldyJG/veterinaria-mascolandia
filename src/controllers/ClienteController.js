const { Op } = require('sequelize');
const { Cliente, Mascota, Cita, Raza, Servicio } = require('../models');
const { isModalRequest, redirectAfterSave } = require('../utils/modalHelpers');

const REGISTROS_POR_PAGINA = 20;

class ClienteController {
  /**
   * GET /clientes
   * Lista clientes con búsqueda (ILIKE) y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = { estado: 1 };

      if (busqueda) {
        whereClause[Op.or] = [
          { nombreCompleto: { [Op.iLike]: `%${busqueda}%` } },
          { dni: { [Op.iLike]: `%${busqueda}%` } },
          { telefono: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      const { count, rows: clientes } = await Cliente.findAndCountAll({
        where: whereClause,
        order: [['nombreCompleto', 'ASC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      res.render('clientes/index', {
        title: 'Clientes | Mascolandia',
        pageTitle: 'Gestión de Clientes',
        activePage: '/clientes',
        clientes,
        busqueda,
        pagina,
        totalPaginas,
        totalRegistros: count,
      });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      req.flash('error', 'Error al cargar la lista de clientes.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /clientes/crear
   * Renderiza el formulario de creación.
   */
  static async create(req, res) {
    return res.redirect('/clientes?modal=modal-crear-cliente');
  }

  /**
   * POST /clientes
   * Guarda un nuevo cliente. La validación de DNI único se maneja en el validator.
   */
  static async store(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const { nombreCompleto, dni, direccion, telefono, correo } = req.body;

      await Cliente.create({
        nombreCompleto: nombreCompleto.trim(),
        dni: dni ? dni.trim() : null,
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        correo: correo ? correo.trim() : null,
        estado: 1,
      });

      if (isAjax) {
        return res.json({ success: true, message: 'Cliente registrado correctamente.' });
      }

      req.flash('success', 'Cliente registrado correctamente.');
      res.redirect('/clientes');
    } catch (error) {
      console.error('Error al crear cliente:', error);
      if (isAjax) {
        return res.status(500).json({ success: false, errors: ['Error al registrar el cliente. Intente nuevamente.'] });
      }
      req.flash('error', 'Error al registrar el cliente. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * GET /clientes/:id
   * Muestra el detalle de un cliente con sus mascotas y citas asociadas.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const cliente = await Cliente.findOne({
        where: { id, estado: 1 },
        include: [
          {
            model: Mascota,
            as: 'mascotas',
            where: { estado: 1 },
            required: false,
            include: [
              { model: Raza, as: 'raza' },
            ],
          },
        ],
      });

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado.');
        return res.redirect('/clientes');
      }

      // Obtener citas de todas las mascotas del cliente
      const idsMascotas = cliente.mascotas.map((m) => m.id);
      const citas = idsMascotas.length > 0
        ? await Cita.findAll({
            where: { idMascota: { [Op.in]: idsMascotas } },
            include: [
              { model: Mascota, as: 'mascota' },
              { model: Servicio, as: 'servicio' },
            ],
            order: [['fecha', 'DESC'], ['hora', 'DESC']],
          })
        : [];

      res.render('clientes/show', {
        title: `${cliente.nombreCompleto} | Mascolandia`,
        pageTitle: 'Detalle del Cliente',
        activePage: '/clientes',
        cliente,
        citas,
      });
    } catch (error) {
      console.error('Error al mostrar cliente:', error);
      req.flash('error', 'Error al cargar los datos del cliente.');
      res.redirect('/clientes');
    }
  }

  /**
   * GET /clientes/:id/editar
   * Renderiza el formulario de edición.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const cliente = await Cliente.findOne({ where: { id, estado: 1 } });

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado.');
        return res.redirect('/clientes');
      }

      res.render('clientes/edit', {
        title: `Editar Cliente | Mascolandia`,
        pageTitle: 'Editar Cliente',
        activePage: '/clientes',
        cliente,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/clientes');
    }
  }

  /**
   * PUT /clientes/:id
   * Actualiza los datos de un cliente. La validación de DNI único se maneja en el validator.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombreCompleto, dni, direccion, telefono, correo } = req.body;

      const cliente = await Cliente.findOne({ where: { id, estado: 1 } });

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado.');
        return res.redirect('/clientes');
      }

      await cliente.update({
        nombreCompleto: nombreCompleto.trim(),
        dni: dni ? dni.trim() : null,
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        correo: correo ? correo.trim() : null,
      });

      req.flash('success', 'Cliente actualizado correctamente.');
      redirectAfterSave(req, res, '/clientes', `/clientes/${id}`);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      req.flash('error', 'Error al actualizar el cliente. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /clientes/:id
   * Soft delete: establece estado = 0 (no elimina físicamente).
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const cliente = await Cliente.findOne({ where: { id, estado: 1 } });

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado.');
        return res.redirect('/clientes');
      }

      await cliente.update({ estado: 0 });

      req.flash('success', 'Cliente eliminado correctamente.');
      res.redirect('/clientes');
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      req.flash('error', 'Error al eliminar el cliente. Intente nuevamente.');
      res.redirect('/clientes');
    }
  }

  /**
   * GET /clientes/:id/modal?vista=ver|editar
   * Fragmento HTML para modal de ver / editar.
   */
  static async modal(req, res) {
    try {
      const { id } = req.params;
      const vista = req.query.vista;

      if (!isModalRequest(req)) {
        return res.redirect(vista === 'editar' ? `/clientes/${id}/editar` : `/clientes/${id}`);
      }

      if (!['ver', 'editar'].includes(vista)) {
        return res.status(400).send('Vista no válida');
      }

      const cliente = await Cliente.findOne({
        where: { id, estado: 1 },
        include: vista === 'ver' ? [{
          model: Mascota,
          as: 'mascotas',
          where: { estado: 1 },
          required: false,
          include: [{ model: Raza, as: 'raza' }],
        }] : [],
      });

      if (!cliente) {
        return res.status(404).send('Cliente no encontrado');
      }

      return res.render(`partials/modals/fragments/cliente-${vista}`, { cliente, layout: false });
    } catch (error) {
      console.error('Error modal cliente:', error);
      return res.status(500).send('Error al cargar el modal');
    }
  }
}

module.exports = ClienteController;
