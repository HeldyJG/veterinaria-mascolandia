const { Op } = require('sequelize');
const sequelize = require('../config/database');
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
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const estado = req.query.estado || '';
      const fecha = req.query.fecha || '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = {};

      if (busqueda) {
        whereClause[Op.or] = [
          { '$mascota.nombre$': { [Op.iLike]: `%${busqueda}%` } },
          { '$mascota.cliente.nombre_completo$': { [Op.iLike]: `%${busqueda}%` } },
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

      const [mascotas, usuarios, servicios, razas] = await Promise.all([
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
        Raza.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
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
        razas,
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

      // Validar existencia de Mascota, Usuario y Servicio
      const [mascota, usuario, servicio] = await Promise.all([
        Mascota.findOne({ where: { id: parseInt(idMascota, 10), estado: 1 } }),
        Usuario.findOne({ where: { id: parseInt(idUsuario, 10), estado: 1 } }),
        Servicio.findOne({ where: { id: parseInt(idServicio, 10), estado: 1 } }),
      ]);

      if (!mascota) {
        throw new Error('La mascota seleccionada no es válida o no existe.');
      }
      if (!usuario) {
        throw new Error('El veterinario/usuario seleccionado no es válido o no existe.');
      }
      if (!servicio) {
        throw new Error('El servicio seleccionado no es válido o no existe.');
      }

      await Cita.create({
        idMascota: parseInt(idMascota, 10),
        idUsuario: parseInt(idUsuario, 10),
        idServicio: parseInt(idServicio, 10),
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

      const errorMsg = error.message.includes('válida o no existe') || error.message.includes('seleccionado') 
        ? error.message 
        : 'Error al programar la cita. Intente nuevamente.';

      if (isAjax) {
        return res.status(500).json({ success: false, errors: [errorMsg] });
      }

      req.flash('error', errorMsg);
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

      // Validar existencia de Mascota, Usuario y Servicio
      const [mascota, usuario, servicio] = await Promise.all([
        Mascota.findOne({ where: { id: parseInt(idMascota, 10), estado: 1 } }),
        Usuario.findOne({ where: { id: parseInt(idUsuario, 10), estado: 1 } }),
        Servicio.findOne({ where: { id: parseInt(idServicio, 10), estado: 1 } }),
      ]);

      if (!mascota) {
        throw new Error('La mascota seleccionada no es válida o no existe.');
      }
      if (!usuario) {
        throw new Error('El veterinario/usuario seleccionado no es válido o no existe.');
      }
      if (!servicio) {
        throw new Error('El servicio seleccionado no es válido o no existe.');
      }

      await cita.update({
        idMascota: parseInt(idMascota, 10),
        idUsuario: parseInt(idUsuario, 10),
        idServicio: parseInt(idServicio, 10),
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
      const errorMsg = error.message.includes('válida o no existe') || error.message.includes('seleccionado')
        ? error.message
        : 'Error al actualizar la cita. Intente nuevamente.';
      req.flash('error', errorMsg);
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

  /**
   * POST /api/citas/express
   * Registro exprés: crea Cliente → Mascota → Cita en una sola transacción.
   * Si algo falla, se hace rollback completo.
   */
  static async expressStore(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const {
        dni, nombreCliente, telefono,
        nombreMascota, idRaza,
        idUsuario, idServicio,
        fecha, hora, turno, motivoDetalle,
      } = req.body;

      // Validaciones báscias
      if (!dni || !dni.trim()) {
        throw new Error('El DNI del dueño es obligatorio.');
      }
      if (!nombreCliente || !nombreCliente.trim()) {
        throw new Error('El nombre del dueño es obligatorio.');
      }
      if (!telefono || !telefono.trim()) {
        throw new Error('El celular es obligatorio.');
      }
      if (!nombreMascota || !nombreMascota.trim()) {
        throw new Error('El nombre de la mascota es obligatorio.');
      }
      if (!idRaza) {
        throw new Error('La raza es obligatoria.');
      }
      if (!idUsuario) {
        throw new Error('El veterinario es obligatorio.');
      }
      if (!idServicio) {
        throw new Error('El servicio es obligatorio.');
      }
      if (!fecha || !hora || !turno) {
        throw new Error('Fecha, hora y turno son obligatorios.');
      }

      const resultado = await sequelize.transaction(async (t) => {
        // 1. Crear Cliente
        const cliente = await Cliente.create({
          nombreCompleto: nombreCliente.trim(),
          telefono: telefono.trim(),
          direccion: 'S/N',
          correo: null,
          dni: dni.trim(),
          estado: 1,
        }, { transaction: t });

        // 2. Crear Mascota
        const mascota = await Mascota.create({
          nombre: nombreMascota.trim(),
          idCliente: cliente.id,
          idRaza: parseInt(idRaza, 10),
          sexo: null,
          fechaNacimiento: null,
          pesoActual: null,
          color: null,
          foto: null,
          estado: 1,
        }, { transaction: t });

        // 3. Crear Cita
        const cita = await Cita.create({
          idMascota: mascota.id,
          idUsuario: parseInt(idUsuario, 10),
          idServicio: parseInt(idServicio, 10),
          fecha,
          hora,
          turno,
          motivoDetalle: motivoDetalle ? motivoDetalle.trim() : null,
          estado: 'PENDIENTE',
        }, { transaction: t });

        return { cliente, mascota, cita };
      });

      console.log(`Registro exprés OK — Cliente #${resultado.cliente.id}, Mascota #${resultado.mascota.id}, Cita #${resultado.cita.id}`);

      if (isAjax) {
        return res.json({
          success: true,
          message: 'Cliente, mascota y cita registrados correctamente.',
          data: {
            idCliente: resultado.cliente.id,
            idMascota: resultado.mascota.id,
            idCita: resultado.cita.id,
          },
        });
      }

      req.flash('success', 'Cliente, mascota y cita registrados correctamente.');
      return res.redirect('/citas');
    } catch (error) {
      console.error('Error en registro exprés de cita:', error);

      const errorMsg = error.message || 'Error al procesar el registro exprés. Intente nuevamente.';

      if (isAjax) {
        return res.status(422).json({ success: false, errors: [errorMsg] });
      }

      req.flash('error', errorMsg);
      return res.redirect(buildCitaErrorRedirect(req.body));
    }
  }
}

module.exports = CitaController;