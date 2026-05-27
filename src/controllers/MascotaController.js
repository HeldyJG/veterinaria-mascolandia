'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { Mascota, Cliente, Raza, Especie, Cita, HistorialClinico, Servicio, Usuario } = require('../models');
const { isModalRequest, redirectAfterSave } = require('../utils/modalHelpers');

const REGISTROS_POR_PAGINA = 20;

/**
 * Calcula la edad de una mascota a partir de su fecha de nacimiento.
 * Devuelve un objeto { años, meses } o null si no hay fecha.
 */
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

  let años = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();

  if (meses < 0) {
    años -= 1;
    meses += 12;
  }

  // Ajuste si aún no llegó el día de cumpleaños en el mes actual
  if (hoy.getDate() < nacimiento.getDate()) {
    meses -= 1;
    if (meses < 0) {
      años -= 1;
      meses += 12;
    }
  }

  return { años, meses };
}

class MascotaController {
  /**
   * GET /mascotas
   * Lista mascotas activas con búsqueda (ILIKE en nombre y nombre de cliente) y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      // Construir condición WHERE con búsqueda OR entre nombre de mascota y nombre de cliente
      const whereBase = { estado: 1 };
      if (busqueda) {
        whereBase[Op.or] = [
          { nombre: { [Op.iLike]: `%${busqueda}%` } },
          { '$cliente.nombre_completo$': { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      const { count, rows: mascotasFinal } = await Mascota.findAndCountAll({
        where: whereBase,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            required: false,
          },
          {
            model: Raza,
            as: 'raza',
            include: [{ model: Especie, as: 'especie' }],
          },
        ],
        order: [['nombre', 'ASC']],
        limit: REGISTROS_POR_PAGINA,
        offset,
        distinct: true,
        subQuery: false,
      });

      const totalRegistros = count;

      const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);

      const [clientes, especies, razas] = await Promise.all([
        Cliente.findAll({ where: { estado: 1 }, order: [['nombreCompleto', 'ASC']] }),
        Especie.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        Raza.findAll({
          where: { estado: 1 },
          include: [{ model: Especie, as: 'especie' }],
          order: [['nombre', 'ASC']],
        }),
      ]);

      res.render('mascotas/index', {
        title: 'Mascotas | Mascolandia',
        pageTitle: 'Gestión de Mascotas',
        activePage: '/mascotas',
        mascotas: mascotasFinal,
        busqueda,
        pagina,
        totalPaginas,
        totalRegistros,
        clientes,
        especies,
        razas,
      });
    } catch (error) {
      console.error('Error al listar mascotas:', error);
      req.flash('error', 'Error al cargar la lista de mascotas.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /mascotas/crear
   * Renderiza el formulario de creación con clientes, especies y razas activas.
   */
  static async create(req, res) {
    return res.redirect('/mascotas?modal=modal-crear-mascota');
  }

  /**
   * POST /mascotas
   * Guarda una nueva mascota. La foto es manejada por uploadFoto.single('foto') en la ruta.
   */
  static async store(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const { nombre, idCliente, idRaza, sexo, fechaNacimiento, pesoActual, color } = req.body;

      // Nombre del archivo de foto (si se subió)
      const foto = req.file ? req.file.filename : null;

      await Mascota.create({
        nombre: nombre.trim(),
        idCliente,
        idRaza,
        sexo: sexo || null,
        fechaNacimiento: fechaNacimiento || null,
        pesoActual: pesoActual || null,
        color: color ? color.trim() : null,
        foto,
        estado: 1,
      });

      if (isAjax) {
        return res.json({ success: true, message: 'Mascota registrada correctamente.' });
      }

      req.flash('success', 'Mascota registrada correctamente.');
      res.redirect('/mascotas');
    } catch (error) {
      console.error('Error al crear mascota:', error);
      if (isAjax) {
        return res.status(500).json({ success: false, errors: ['Error al registrar la mascota. Intente nuevamente.'] });
      }
      req.flash('error', 'Error al registrar la mascota. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * GET /mascotas/:id
   * Muestra el detalle de una mascota con historial clínico y citas.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const mascota = await Mascota.findOne({
        where: { id, estado: 1 },
        include: [
          { model: Cliente, as: 'cliente' },
          {
            model: Raza,
            as: 'raza',
            include: [{ model: Especie, as: 'especie' }],
          },
        ],
      });

      if (!mascota) {
        req.flash('error', 'Mascota no encontrada.');
        return res.redirect('/mascotas');
      }

      // Calcular edad
      const edad = calcularEdad(mascota.fechaNacimiento);

      // Historial clínico ordenado por fecha descendente
      const historiales = await HistorialClinico.findAll({
        where: { idMascota: id, estado: 1 },
        include: [
          { model: Usuario, as: 'usuario' },
          { model: Cita, as: 'cita', include: [{ model: Servicio, as: 'servicio' }] },
        ],
        order: [['fechaRegistro', 'DESC']],
      });

      // Citas de la mascota
      const citas = await Cita.findAll({
        where: { idMascota: id },
        include: [
          { model: Servicio, as: 'servicio' },
          { model: Usuario, as: 'usuario' },
        ],
        order: [['fecha', 'DESC'], ['hora', 'DESC']],
      });

      res.render('mascotas/show', {
        title: `${mascota.nombre} | Mascolandia`,
        pageTitle: 'Detalle de Mascota',
        activePage: '/mascotas',
        mascota,
        edad,
        historiales,
        citas,
      });
    } catch (error) {
      console.error('Error al mostrar mascota:', error);
      req.flash('error', 'Error al cargar los datos de la mascota.');
      res.redirect('/mascotas');
    }
  }

  /**
   * GET /mascotas/:id/editar
   * Renderiza el formulario de edición con datos actuales y listas necesarias.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const [mascota, clientes, especies, razas] = await Promise.all([
        Mascota.findOne({
          where: { id, estado: 1 },
          include: [
            { model: Raza, as: 'raza', include: [{ model: Especie, as: 'especie' }] },
          ],
        }),
        Cliente.findAll({ where: { estado: 1 }, order: [['nombreCompleto', 'ASC']] }),
        Especie.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
        Raza.findAll({
          where: { estado: 1 },
          include: [{ model: Especie, as: 'especie' }],
          order: [['nombre', 'ASC']],
        }),
      ]);

      if (!mascota) {
        req.flash('error', 'Mascota no encontrada.');
        return res.redirect('/mascotas');
      }

      res.render('mascotas/edit', {
        title: `Editar Mascota | Mascolandia`,
        pageTitle: 'Editar Mascota',
        activePage: '/mascotas',
        mascota,
        clientes,
        especies,
        razas,
        fotoActual: mascota.foto,
      });
    } catch (error) {
      console.error('Error al renderizar formulario de edición de mascota:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/mascotas');
    }
  }

  /**
   * PUT /mascotas/:id
   * Actualiza los datos de una mascota.
   * Si se sube una nueva foto, elimina la anterior del sistema de archivos.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, idCliente, idRaza, sexo, fechaNacimiento, pesoActual, color } = req.body;

      const mascota = await Mascota.findOne({ where: { id, estado: 1 } });

      if (!mascota) {
        req.flash('error', 'Mascota no encontrada.');
        return res.redirect('/mascotas');
      }

      // Manejar foto: si se subió una nueva, eliminar la anterior
      let foto = mascota.foto; // mantener la foto actual por defecto

      if (req.file) {
        // Eliminar foto anterior si existe
        if (mascota.foto) {
          const rutaFotoAnterior = path.join(__dirname, '../../uploads/fotos/', mascota.foto);
          try {
            await fs.promises.unlink(rutaFotoAnterior);
          } catch (unlinkError) {
            // Si el archivo no existe, continuar sin error
            console.warn(`No se pudo eliminar la foto anterior: ${rutaFotoAnterior}`, unlinkError.message);
          }
        }
        foto = req.file.filename;
      }

      await mascota.update({
        nombre: nombre.trim(),
        idCliente,
        idRaza,
        sexo: sexo || null,
        fechaNacimiento: fechaNacimiento || null,
        pesoActual: pesoActual || null,
        color: color ? color.trim() : null,
        foto,
      });

      req.flash('success', 'Mascota actualizada correctamente.');
      redirectAfterSave(req, res, '/mascotas', `/mascotas/${id}`);
    } catch (error) {
      console.error('Error al actualizar mascota:', error);
      req.flash('error', 'Error al actualizar la mascota. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /mascotas/:id
   * Soft delete: establece estado = 0 (no elimina físicamente).
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const mascota = await Mascota.findOne({ where: { id, estado: 1 } });

      if (!mascota) {
        req.flash('error', 'Mascota no encontrada.');
        return res.redirect('/mascotas');
      }

      // Eliminar foto del disco si existe
      if (mascota.foto) {
        const rutaFoto = path.join(__dirname, '../../uploads/fotos/', mascota.foto);
        try {
          fs.unlinkSync(rutaFoto);
        } catch (unlinkError) {
          console.warn(`No se pudo eliminar la foto de la mascota al desactivarla: ${rutaFoto}`, unlinkError.message);
        }
      }

      await mascota.update({ estado: 0, foto: null });

      req.flash('success', 'Mascota eliminada correctamente.');
      res.redirect('/mascotas');
    } catch (error) {
      console.error('Error al eliminar mascota:', error);
      req.flash('error', 'Error al eliminar la mascota. Intente nuevamente.');
      res.redirect('/mascotas');
    }
  }

  /**
   * GET /api/razas/:idEspecie
   * API JSON: devuelve las razas activas de una especie para carga dinámica (AJAX).
   */
  static async modal(req, res) {
    try {
      const { id } = req.params;
      const vista = req.query.vista;

      if (!isModalRequest(req)) {
        return res.redirect(vista === 'editar' ? `/mascotas/${id}/editar` : `/mascotas/${id}`);
      }

      if (!['ver', 'editar'].includes(vista)) {
        return res.status(400).send('Vista no válida');
      }

      const mascota = await Mascota.findOne({
        where: { id, estado: 1 },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Raza, as: 'raza', include: [{ model: Especie, as: 'especie' }] },
        ],
      });

      if (!mascota) {
        return res.status(404).send('Mascota no encontrada');
      }

      let clientes = [];
      let especies = [];
      let razas = [];

      if (vista === 'editar') {
        [clientes, especies, razas] = await Promise.all([
          Cliente.findAll({ where: { estado: 1 }, order: [['nombreCompleto', 'ASC']] }),
          Especie.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
          Raza.findAll({
            where: { estado: 1 },
            include: [{ model: Especie, as: 'especie' }],
            order: [['nombre', 'ASC']],
          }),
        ]);
      }

      return res.render(`partials/modals/fragments/mascota-${vista}`, {
        mascota,
        clientes,
        especies,
        razas,
        layout: false,
      });
    } catch (error) {
      console.error('Error modal mascota:', error);
      return res.status(500).send('Error al cargar el modal');
    }
  }

  static async getRazasByEspecie(req, res) {
    try {
      const { idEspecie } = req.params;

      const razas = await Raza.findAll({
        where: { idEspecie, estado: 1 },
        order: [['nombre', 'ASC']],
        attributes: ['id', 'nombre'],
      });

      return res.json({ success: true, data: razas });
    } catch (error) {
      console.error('Error al obtener razas por especie:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener las razas.' });
    }
  }

  /**
   * GET /api/mascotas/search?q=
   * Busca mascotas por nombre, nombre del dueño o DNI del dueño (autocomplete).
   */
  static async search(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';

      const where = { estado: 1 };
      if (q.length > 0) {
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${q}%` } },
          { '$cliente.nombre_completo$': { [Op.iLike]: `%${q}%` } },
          { '$cliente.dni$': { [Op.iLike]: `%${q}%` } },
        ];
      }

      const mascotas = await Mascota.findAll({
        where,
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Raza, as: 'raza' },
        ],
        limit: 15,
        order: [['nombre', 'ASC']],
        subQuery: false,
      });

      return res.json({ success: true, data: mascotas });
    } catch (error) {
      console.error('Error al buscar mascotas:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = MascotaController;
