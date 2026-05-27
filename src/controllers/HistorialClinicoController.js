const { Op } = require('sequelize');
const { HistorialClinico, Cita, Mascota, Cliente, Usuario, Raza, Servicio, ExamenLaboratorio } = require('../models');

const REGISTROS_POR_PAGINA = 20;
const HORAS_LIMITE_EDICION = 24;

function puedeEditarHistorial(historial) {
  if (!historial || !historial.fechaRegistro) return false;
  const registro = new Date(historial.fechaRegistro);
  const limite = registro.getTime() + HORAS_LIMITE_EDICION * 60 * 60 * 1000;
  return Date.now() <= limite;
}

class HistorialClinicoController {
  /**
   * GET /historial-clinico
   * Lista historiales clínicos con búsqueda y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const fechaDesde = req.query.fechaDesde || '';
      const fechaHasta = req.query.fechaHasta || '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = { estado: 1 };

      if (busqueda) {
        whereClause[Op.or] = [
          { '$mascota.nombre$': { [Op.iLike]: `%${busqueda}%` } },
          { '$mascota.cliente.nombre_completo$': { [Op.iLike]: `%${busqueda}%` } },
          { diagnostico: { [Op.iLike]: `%${busqueda}%` } },
          { motivoConsulta: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      if (fechaDesde && fechaHasta) {
        whereClause.fechaRegistro = {
          [Op.between]: [fechaDesde, fechaHasta + ' 23:59:59'],
        };
      } else if (fechaDesde) {
        whereClause.fechaRegistro = {
          [Op.gte]: fechaDesde,
        };
      } else if (fechaHasta) {
        whereClause.fechaRegistro = {
          [Op.lte]: fechaHasta + ' 23:59:59',
        };
      }

      const { count, rows: historiales } = await HistorialClinico.findAndCountAll({
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
          {
            model: Cita,
            as: 'cita',
            required: false,
            include: [{ model: Servicio, as: 'servicio' }],
          },
        ],
        order: [['fechaRegistro', 'DESC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
        distinct: true,
        subQuery: false,
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      const historialesConEdicion = historiales.map((h) => {
        const data = h.toJSON();
        data.puedeEditar = puedeEditarHistorial(data);
        return data;
      });

      const idCitaQuery = req.query.cita || null;
      let citaModal = null;
      if (idCitaQuery) {
        citaModal = await Cita.findByPk(idCitaQuery, {
          include: [
            {
              model: Mascota,
              as: 'mascota',
              include: [{ model: Cliente, as: 'cliente' }],
            },
          ],
        });
      }

      const [mascotas, usuarios] = await Promise.all([
        Mascota.findAll({
          where: { estado: 1 },
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Raza, as: 'raza' },
          ],
          order: [['nombre', 'ASC']],
        }),
        Usuario.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
      ]);

      res.render('historial-clinico/index', {
        title: 'Historial Clínico | Mascolandia',
        pageTitle: 'Historial Clínico',
        activePage: '/historial-clinico',
        historiales: historialesConEdicion,
        busqueda,
        fechaDesde,
        fechaHasta,
        pagina,
        totalPaginas,
        totalRegistros: count,
        mascotas,
        usuarios,
        idCita: idCitaQuery,
        citaModal,
      });
    } catch (error) {
      console.error('Error al listar historiales clínicos:', error);
      req.flash('error', 'Error al cargar la lista de historiales clínicos.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /historial-clinico/crear
   * Renderiza el formulario de creación.
   */
  static async create(req, res) {
    const params = new URLSearchParams({ modal: 'modal-crear-historial' });
    const idCita = req.query.cita || req.query.idCita;
    if (idCita) params.set('cita', idCita);
    return res.redirect(`/historial-clinico?${params.toString()}`);
  }

  /**
   * POST /historial-clinico
   * Guarda un nuevo historial clínico.
   */
  static async store(req, res) {
    try {
      const {
        idMascota,
        idUsuario,
        idCita,
        motivoConsulta,
        sintomas,
        peso,
        temperatura,
        diagnostico,
        tratamiento,
        observaciones,
      } = req.body;

      await HistorialClinico.create({
        idMascota: parseInt(idMascota),
        idUsuario: parseInt(idUsuario),
        idCita: idCita ? parseInt(idCita) : null,
        motivoConsulta: motivoConsulta ? motivoConsulta.trim() : null,
        sintomas: sintomas ? sintomas.trim() : null,
        peso: peso ? parseFloat(peso) : null,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        diagnostico: diagnostico ? diagnostico.trim() : null,
        tratamiento: tratamiento ? tratamiento.trim() : null,
        observaciones: observaciones ? observaciones.trim() : null,
        estado: 1,
      });

      // Si está asociado a una cita, marcarla como atendida
      if (idCita) {
        const cita = await Cita.findByPk(idCita);
        if (cita) {
          await cita.update({ estado: 'ATENDIDA' });
        }
      }

      req.flash('success', 'Historial clínico registrado correctamente.');
      res.redirect('/historial-clinico');
    } catch (error) {
      console.error('Error al crear historial clínico:', error);
      req.flash('error', 'Error al registrar el historial clínico. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * GET /historial-clinico/:id
   * Muestra el detalle de un historial clínico.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const historial = await HistorialClinico.findOne({
        where: { id, estado: 1 },
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
          {
            model: Cita,
            as: 'cita',
            required: false,
            include: [{ model: Servicio, as: 'servicio' }],
          },
          {
            model: ExamenLaboratorio,
            as: 'examenes',
            required: false,
            separate: true,
            order: [['fechaRegistro', 'DESC']],
          },
        ],
      });

      if (!historial) {
        req.flash('error', 'Historial clínico no encontrado.');
        return res.redirect('/historial-clinico');
      }

      // Obtener otros historiales de la misma mascota
      const otrosHistoriales = await HistorialClinico.findAll({
        where: {
          idMascota: historial.idMascota,
          id: { [Op.ne]: historial.id },
          estado: 1,
        },
        include: [{ model: Usuario, as: 'usuario' }],
        order: [['fechaRegistro', 'DESC']],
        limit: 5,
      });

      res.render('historial-clinico/show', {
        title: `Historial ${historial.id} | Mascolandia`,
        pageTitle: 'Detalle del Historial Clínico',
        activePage: '/historial-clinico',
        historial,
        otrosHistoriales,
        puedeEditar: puedeEditarHistorial(historial),
      });
    } catch (error) {
      console.error('Error al mostrar historial clínico:', error);
      req.flash('error', 'Error al cargar los datos del historial clínico.');
      res.redirect('/historial-clinico');
    }
  }

  /**
   * GET /historial-clinico/:id/editar
   * Renderiza el formulario de edición.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const historial = await HistorialClinico.findOne({
        where: { id, estado: 1 },
        include: [
          {
            model: Mascota,
            as: 'mascota',
            include: [{ model: Cliente, as: 'cliente' }],
          },
          { model: Usuario, as: 'usuario' },
          {
            model: Cita,
            as: 'cita',
            required: false,
            include: [{ model: Servicio, as: 'servicio' }],
          },
        ],
      });

      if (!historial) {
        req.flash('error', 'Historial clínico no encontrado.');
        return res.redirect('/historial-clinico');
      }

      if (!puedeEditarHistorial(historial)) {
        req.flash(
          'error',
          `Solo se puede editar el historial durante las primeras ${HORAS_LIMITE_EDICION} horas después de su registro.`
        );
        return res.redirect(`/historial-clinico/${id}`);
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

      res.render('historial-clinico/edit', {
        title: `Editar Historial | Mascolandia`,
        pageTitle: 'Editar Historial Clínico',
        activePage: '/historial-clinico',
        historial,
        mascotas,
        usuarios,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/historial-clinico');
    }
  }

  /**
   * PUT /historial-clinico/:id
   * Actualiza los datos de un historial clínico.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        idMascota,
        idUsuario,
        motivoConsulta,
        sintomas,
        peso,
        temperatura,
        diagnostico,
        tratamiento,
        observaciones,
      } = req.body;

      const historial = await HistorialClinico.findOne({ where: { id, estado: 1 } });

      if (!historial) {
        req.flash('error', 'Historial clínico no encontrado.');
        return res.redirect('/historial-clinico');
      }

      if (!puedeEditarHistorial(historial)) {
        req.flash(
          'error',
          `Solo se puede editar el historial durante las primeras ${HORAS_LIMITE_EDICION} horas después de su registro.`
        );
        return res.redirect(`/historial-clinico/${id}`);
      }

      await historial.update({
        idMascota: parseInt(idMascota),
        idUsuario: parseInt(idUsuario),
        motivoConsulta: motivoConsulta ? motivoConsulta.trim() : null,
        sintomas: sintomas ? sintomas.trim() : null,
        peso: peso ? parseFloat(peso) : null,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        diagnostico: diagnostico ? diagnostico.trim() : null,
        tratamiento: tratamiento ? tratamiento.trim() : null,
        observaciones: observaciones ? observaciones.trim() : null,
      });

      req.flash('success', 'Historial clínico actualizado correctamente.');
      res.redirect(`/historial-clinico/${id}`);
    } catch (error) {
      console.error('Error al actualizar historial clínico:', error);
      req.flash('error', 'Error al actualizar el historial clínico. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /historial-clinico/:id
   * Soft delete: establece estado = 0.
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const historial = await HistorialClinico.findOne({ where: { id, estado: 1 } });

      if (!historial) {
        req.flash('error', 'Historial clínico no encontrado.');
        return res.redirect('/historial-clinico');
      }

      await historial.update({ estado: 0 });

      req.flash('success', 'Historial clínico eliminado correctamente.');
      res.redirect('/historial-clinico');
    } catch (error) {
      console.error('Error al eliminar historial clínico:', error);
      req.flash('error', 'Error al eliminar el historial clínico. Intente nuevamente.');
      res.redirect('/historial-clinico');
    }
  }

  /**
   * GET /mascotas/:id/historial
   * Muestra el historial completo de una mascota.
   */
  static async historialMascota(req, res) {
    try {
      const { id } = req.params;

      const mascota = await Mascota.findOne({
        where: { id, estado: 1 },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Raza, as: 'raza' },
        ],
      });

      if (!mascota) {
        req.flash('error', 'Mascota no encontrada.');
        return res.redirect('/mascotas');
      }

      const historiales = await HistorialClinico.findAll({
        where: { idMascota: id, estado: 1 },
        include: [
          { model: Usuario, as: 'usuario' },
          {
            model: Cita,
            as: 'cita',
            required: false,
            include: [{ model: Servicio, as: 'servicio' }],
          },
        ],
        order: [['fechaRegistro', 'DESC']],
      });

      res.render('historial-clinico/mascota', {
        title: `Historial de ${mascota.nombre} | Mascolandia`,
        pageTitle: `Historial Clínico de ${mascota.nombre}`,
        activePage: '/historial-clinico',
        mascota,
        historiales,
      });
    } catch (error) {
      console.error('Error al mostrar historial de mascota:', error);
      req.flash('error', 'Error al cargar el historial de la mascota.');
      res.redirect('/mascotas');
    }
  }
}

module.exports = HistorialClinicoController;
module.exports.puedeEditarHistorial = puedeEditarHistorial;
module.exports.HORAS_LIMITE_EDICION = HORAS_LIMITE_EDICION;