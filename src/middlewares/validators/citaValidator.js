const { body, validationResult } = require('express-validator');
const Mascota = require('../../models/Mascota');
const Usuario = require('../../models/Usuario');
const Servicio = require('../../models/Servicio');
const { ejecutarValidacion } = require('./validatorHelper');

const buildCitaRedirectQuery = (body) => {
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

/**
 * Parsea una fecha en formato YYYY-MM-DD como fecha local (sin conversión UTC).
 * Evita el problema de que new Date('2026-05-22') se interprete como UTC medianoche.
 */
const parseFechaLocal = (valor) => {
  const partes = (valor || '').split('-').map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) return new Date(NaN);
  const [year, month, day] = partes;
  return new Date(year, month - 1, day);
};

/**
 * Obtiene la fecha de hoy a medianoche en hora local.
 */
const hoyLocal = () => {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
};

/**
 * Reglas comunes para crear y actualizar una cita.
 * Incluye validaciones de idMascota, idUsuario, idServicio, hora, turno y motivoDetalle.
 */
const reglasComunes = [
  // idMascota: obligatorio, debe existir en BD con estado=1
  body('idMascota')
    .notEmpty().withMessage('La mascota es obligatoria.')
    .isInt({ min: 1 }).withMessage('El identificador de mascota no es válido.')
    .custom(async (valor) => {
      const mascota = await Mascota.findOne({ where: { id: valor, estado: 1 } });
      if (!mascota) {
        throw new Error('La mascota seleccionada no existe o está inactiva.');
      }
    }),

  // idUsuario: obligatorio, debe existir en BD con estado=1
  body('idUsuario')
    .notEmpty().withMessage('El usuario (veterinario) es obligatorio.')
    .isInt({ min: 1 }).withMessage('El identificador de usuario no es válido.')
    .custom(async (valor) => {
      const usuario = await Usuario.findOne({ where: { id: valor, estado: 1 } });
      if (!usuario) {
        throw new Error('El usuario seleccionado no existe o está inactivo.');
      }
    }),

  // idServicio: obligatorio, debe existir en BD con estado=1
  body('idServicio')
    .notEmpty().withMessage('El servicio es obligatorio.')
    .isInt({ min: 1 }).withMessage('El identificador de servicio no es válido.')
    .custom(async (valor) => {
      const servicio = await Servicio.findOne({ where: { id: valor, estado: 1 } });
      if (!servicio) {
        throw new Error('El servicio seleccionado no existe o está inactivo.');
      }
    }),

  // hora: obligatorio, formato HH:MM
  body('hora')
    .trim()
    .notEmpty().withMessage('La hora es obligatoria.')
    .matches(/^\d{2}:\d{2}$/).withMessage('La hora debe tener el formato HH:MM.'),

  // turno: obligatorio, valores permitidos: MANANA, TARDE
  body('turno')
    .trim()
    .notEmpty().withMessage('El turno es obligatorio.')
    .isIn(['MANANA', 'TARDE']).withMessage('El turno debe ser MANANA o TARDE.'),

  // motivoDetalle: opcional, máximo 1000 caracteres
  body('motivoDetalle')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('El motivo/detalle no puede superar los 1000 caracteres.'),
];

/**
 * Regla de validación de fecha para creación:
 * obligatoria y no puede ser una fecha pasada.
 */
const reglaFechaCreacion = body('fecha')
  .trim()
  .notEmpty().withMessage('La fecha es obligatoria.')
  .isDate({ format: 'YYYY-MM-DD' }).withMessage('La fecha debe tener el formato YYYY-MM-DD.')
  .custom((valor) => {
    const fechaCita = parseFechaLocal(valor);
    if (isNaN(fechaCita.getTime())) {
      throw new Error('La fecha de la cita no es válida.');
    }
    // Comparar solo fechas (sin hora) en zona local
    if (fechaCita < hoyLocal()) {
      throw new Error('La fecha de la cita no puede ser una fecha pasada.');
    }
    return true;
  });

/**
 * Regla de validación de fecha para actualización:
 * opcional, pero si se proporciona debe tener formato válido.
 */
const reglaFechaUpdate = body('fecha')
  .trim()
  .optional({ checkFalsy: true })
  .isDate({ format: 'YYYY-MM-DD' }).withMessage('La fecha debe tener el formato YYYY-MM-DD.');

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * - Si la request es AJAX (X-Requested-With: XMLHttpRequest): responde con JSON { errors: [...] }.
 * - Si es request normal: guarda el primer mensaje en flash y redirige al formulario anterior.
 */

/**
 * Validador para creación de cita.
 * Valida todos los campos incluyendo que la fecha no sea pasada.
 */
const validarCita = (req, res, next) => {
  const reglas = [reglaFechaCreacion, ...reglasComunes];
  return ejecutarValidacion(req, res, next, reglas, buildCitaRedirectQuery(req.body));
};

/**
 * Validador para actualización de cita.
 * La fecha es opcional y no se valida que no sea pasada.
 */
const validarCitaUpdate = (req, res, next) => {
  const reglas = [reglaFechaUpdate, ...reglasComunes];
  return ejecutarValidacion(req, res, next, reglas, 'back');
};

module.exports = { validarCita, validarCitaUpdate };
