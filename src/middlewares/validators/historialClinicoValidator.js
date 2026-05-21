const { body, validationResult } = require('express-validator');
const Mascota = require('../../models/Mascota');
const Usuario = require('../../models/Usuario');
const Cita = require('../../models/Cita');
const { ejecutarValidacion } = require('./validatorHelper');

/**
 * Reglas de validación para crear/actualizar un historial clínico.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasHistorialClinico = [
  // idMascota: obligatorio, debe existir en BD con estado=1
  body('idMascota')
    .notEmpty().withMessage('La mascota es obligatoria.')
    .isInt({ min: 1 }).withMessage('El identificador de mascota no es válido.')
    .custom(async (valor) => {
      const mascota = await Mascota.findOne({ where: { id: valor, estado: 1 } });
      if (!mascota) {
        throw new Error('La mascota seleccionada no existe o no está activa.');
      }
    }),

  // idUsuario: obligatorio, debe existir en BD con estado=1
  body('idUsuario')
    .notEmpty().withMessage('El veterinario/usuario es obligatorio.')
    .isInt({ min: 1 }).withMessage('El identificador de usuario no es válido.')
    .custom(async (valor) => {
      const usuario = await Usuario.findOne({ where: { id: valor, estado: 1 } });
      if (!usuario) {
        throw new Error('El usuario seleccionado no existe o no está activo.');
      }
    }),

  // idCita: opcional, si se envía debe existir en BD
  body('idCita')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('El identificador de cita no es válido.')
    .custom(async (valor) => {
      const cita = await Cita.findByPk(valor);
      if (!cita) {
        throw new Error('La cita seleccionada no existe.');
      }
    }),

  // sintomas: opcional, máximo 2000 caracteres
  body('sintomas')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 }).withMessage('Los síntomas no pueden superar los 2000 caracteres.'),

  // diagnostico: opcional, máximo 2000 caracteres
  body('diagnostico')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 }).withMessage('El diagnóstico no puede superar los 2000 caracteres.'),

  // tratamiento: opcional, máximo 2000 caracteres
  body('tratamiento')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 }).withMessage('El tratamiento no puede superar los 2000 caracteres.'),

  // peso: opcional, entre 0.1 y 500 kg
  body('peso')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.1, max: 500 }).withMessage('El peso debe estar entre 0.1 y 500 kg.'),

  // temperatura: opcional, entre 35.0 y 42.0 °C
  body('temperatura')
    .optional({ checkFalsy: true })
    .isFloat({ min: 35.0, max: 42.0 }).withMessage('La temperatura debe estar entre 35.0 y 42.0 °C.'),

  // observaciones: opcional, máximo 3000 caracteres
  body('observaciones')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 3000 }).withMessage('Las observaciones no pueden superar los 3000 caracteres.'),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * - AJAX: responde con JSON { success: false, errors: [...] }
 * - Normal: flash + redirect back
 */
const validarHistorialClinico = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasHistorialClinico, 'back');

module.exports = { validarHistorialClinico };
