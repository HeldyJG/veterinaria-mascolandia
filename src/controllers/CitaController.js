const { Op } = require('sequelize');
const { Cita, Mascota, Cliente, Usuario, Servicio, Raza } = require('../models');
const { isModalRequest, redirectAfterSave } = require('../utils/modalHelpers');

const REGISTROS_POR_PAGINA = 20;

const buildCitaErrorRedirect = (body) => {
  const params = new URLSearchParams();
  params.set('modal', 'modal-crear-cita');
  params.set('idMascota', body.idMascota || '');
  params.set('idUsuario', body.idUsuario || '');
  params.set('idServicio', body.idServicio || '');
  params.set('fechaCita', body.fecha || '');
  params.set('horaCita', body.hora || '');
  params.set('turnoCita', body.turno || '');
  params.set('motivoDetalleCita', body.motivoDetalle || '');
  return `/citas?${params.toString()}`;
};

class CitaController {
  /**
   * GET /citas
   * Lista citas con búsqueda y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const estado = req.query.estado || '';
      const fecha = req.query.fecha || '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = {};

      if (busqueda) {
        whereClause[Op.or] = [
          { '$mascota.nombre$': { [Op.iLike]: `%${busqueda}%` } },
          { '$mascota.cliente.nombreCompleto$': { [Op.iLike]: `%${busqueda}%` } },
          { '$servicio.nombre$': { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      if (estado) {
        whereClause.estado = estado;
      }

      if (fecha) {
        whereClause.fecha = fecha;
      }

      const { count, rows: citas } = await Cita.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Mascota,
            as: 'mascota',
            include: [
              { model: Cliente, as: 'cliente' },
              { model: Raza, as: 'raza' },
            ],
          },
          { model: Usuario, as: 'usuario' },
          { model: Servicio, as: 'servicio' },
        ],
        order: [['fecha', 'DESC'], ['hora', 'DESC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      const [mascotas, usuarios, servicios] = await Promise.all([
        Mascota.findAll({
          where: { estado: 1 },
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Raza, as: 'raza' },
          ],
          order: [['nombre', 'ASC']],
        }),
        Usuario.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        Servicio.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
      ]);

      res.render('citas/index', {
        title: 'Citas | Mascolandia',
        pageTitle: 'Gestión de Citas',
        activePage: '/citas',
        citas,
        busqueda,
        estado,
        fecha,
        pagina,
        totalPaginas,
        totalRegistros: count,
        mascotas,
        usuarios,
        servicios,
        old: {
          idMascota: req.query.idMascota || '',
          idUsuario: req.query.idUsuario || '',
          idServicio: req.query.idServicio || '',
          fecha: req.query.fechaCita || '',
          hora: req.query.horaCita || '',
          turno: req.query.turnoCita || '',
          motivoDetalle: req.query.motivoDetalleCita || '',
        },
      });
    } catch (error) {
      console.error('Error al listar citas:', error);
      req.flash('error', 'Error al cargar la lista de citas.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /citas/crear
   * Renderiza el formulario de creación.
   */
  static async create(req, res) {
    return res.redirect('/citas?modal=modal-crear-cita');
  }

  /**
   * POST /citas
   * Guarda una nueva cita.
   */
  static async store(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const { idMascota, idUsuario, idServicio, fecha, hora, turno, motivoDetalle } = req.body;

      await Cita.create({
        idMascota: parseInt(idMascota),
        idUsuario: parseInt(idUsuario),
        idServicio: parseInt(idServicio),
        fecha,
        hora,
        turno,
        motivoDetalle: motivoDetalle ? motivoDetalle.trim() : null,
        estado: 'PENDIENTE',
      });

      if (isAjax) {
        return res.json({ success: true, message: 'Cita programada correctamente.' });
      }

      req.flash('success', 'Cita programada correctamente.');
      res.redirect('/citas');
    } catch (error) {
      console.error('Error al crear cita:', error);

      if (isAjax) {
        return res.status(500).json({ success: false, errors: ['Error al programar la cita. Intente nuevamente.'] });
      }

      req.flash('error', 'Error al programar la cita. Intente nuevamente.');
      res.redirect(buildCitaErrorRedirect(req.body));
    }
  }

  /**
   * GET /citas/:id
   * Muestra el detalle de una cita.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const cita = await Cita.findByPk(id, {
        include: [
          {
            model: Mascota,
            as: 'mascota',
            include: [
              { model: Cliente, as: 'cliente' },
              { model: Raza, as: 'raza' },
            ],
          },
          { model: Usuario, as: 'usuario' },
          { model: Servicio, as: 'servicio' },
        ],
      });

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      res.render('citas/show', {
        title: `Cita ${cita.id} | Mascolandia`,
        pageTitle: 'Detalle de la Cita',
        activePage: '/citas',
        cita,
      });
    } catch (error) {
      console.error('Error al mostrar cita:', error);
      req.flash('error', 'Error al cargar los datos de la cita.');
      res.redirect('/citas');
    }
  }

  /**
   * GET /citas/:id/editar
   * Renderiza el formulario de edición.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const cita = await Cita.findByPk(id, {
        include: [
          {
            model: Mascota,
            as: 'mascota',
            include: [{ model: Cliente, as: 'cliente' }],
          },
          { model: Usuario, as: 'usuario' },
          { model: Servicio, as: 'servicio' },
        ],
      });

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      const mascotas = await Mascota.findAll({
        where: { estado: 1 },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Raza, as: 'raza' },
        ],
        order: [['nombre', 'ASC']],
      });

      const usuarios = await Usuario.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      const servicios = await Servicio.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      res.render('citas/edit', {
        title: `Editar Cita | Mascolandia`,
        pageTitle: 'Editar Cita',
        activePage: '/citas',
        cita,
        mascotas,
        usuarios,
        servicios,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/citas');
    }
  }

  /**
   * PUT /citas/:id
   * Actualiza los datos de una cita.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { idMascota, idUsuario, idServicio, fecha, hora, turno, motivoDetalle, estado } = req.body;

      const cita = await Cita.findByPk(id);

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      await cita.update({
        idMascota: parseInt(idMascota),
        idUsuario: parseInt(idUsuario),
        idServicio: parseInt(idServicio),
        fecha,
        hora,
        turno,
        motivoDetalle: motivoDetalle ? motivoDetalle.trim() : null,
        estado: estado || cita.estado,
      });

      req.flash('success', 'Cita actualizada correctamente.');
      redirectAfterSave(req, res, '/citas', `/citas/${id}`);
    } catch (error) {
      console.error('Error al actualizar cita:', error);
      req.flash('error', 'Error al actualizar la cita. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /citas/:id
   * Cancela una cita (cambia estado a CANCELADA).
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const cita = await Cita.findByPk(id);

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      await cita.update({ estado: 'CANCELADA' });

      req.flash('success', 'Cita cancelada correctamente.');
      const listPath = req.body.returnTo === 'list' ? '/citas' : `/citas/${id}`;
      res.redirect(listPath);
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      req.flash('error', 'Error al cancelar la cita. Intente nuevamente.');
      res.redirect('/citas');
    }
  }

  /**
   * PUT /citas/:id/confirmar
   * Confirma una cita (cambia estado a CONFIRMADA).
   */
  static async confirmar(req, res) {
    try {
      const { id } = req.params;

      const cita = await Cita.findByPk(id);

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      await cita.update({ estado: 'CONFIRMADA' });

      req.flash('success', 'Cita confirmada correctamente.');
      redirectAfterSave(req, res, '/citas', `/citas/${id}`);
    } catch (error) {
      console.error('Error al confirmar cita:', error);
      req.flash('error', 'Error al confirmar la cita. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * PUT /citas/:id/atender
   * Marca una cita como atendida (cambia estado a ATENDIDA).
   */
  static async atender(req, res) {
    try {
      const { id } = req.params;

      const cita = await Cita.findByPk(id);

      if (!cita) {
        req.flash('error', 'Cita no encontrada.');
        return res.redirect('/citas');
      }

      await cita.update({ estado: 'ATENDIDA' });

      req.flash('success', 'Cita marcada como atendida.');
      redirectAfterSave(req, res, '/citas', `/citas/${id}`);
    } catch (error) {
      console.error('Error al marcar cita como atendida:', error);
      req.flash('error', 'Error al actualizar el estado de la cita. Intente nuevamente.');
      res.redirect('back');
    }
  }

  static async modal(req, res) {
    try {
      const { id } = req.params;
      const vista = req.query.vista;

      if (!isModalRequest(req)) {
        return res.redirect(vista === 'editar' ? `/citas/${id}/editar` : `/citas/${id}`);
      }

      if (!['ver', 'editar'].includes(vista)) {
        return res.status(400).send('Vista no válida');
      }

      const cita = await Cita.findByPk(id, {
        include: [
          {
            model: Mascota,
            as: 'mascota',
            include: [
              { model: Cliente, as: 'cliente' },
              { model: Raza, as: 'raza' },
            ],
          },
          { model: Usuario, as: 'usuario' },
          { model: Servicio, as: 'servicio' },
        ],
      });

      if (!cita) {
        return res.status(404).send('Cita no encontrada');
      }

      let mascotas = [];
      let usuarios = [];
      let servicios = [];

      if (vista === 'editar') {
        [mascotas, usuarios, servicios] = await Promise.all([
          Mascota.findAll({
            where: { estado: 1 },
            include: [
              { model: Cliente, as: 'cliente' },
              { model: Raza, as: 'raza' },
            ],
            order: [['nombre', 'ASC']],
          }),
          Usuario.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
          Servicio.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        ]);
      }

      return res.render(`partials/modals/fragments/cita-${vista}`, {
        cita,
        mascotas,
        usuarios,
        servicios,
        layout: false,
      });
    } catch (error) {
      console.error('Error modal cita:', error);
      return res.status(500).send('Error al cargar el modal');
    }
  }
}

module.exports = CitaController;