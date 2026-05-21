const { body, validationResult } = require('express-validator');
const Cliente = require('../../models/Cliente');
const Raza = require('../../models/Raza');
const { ejecutarValidacion } = require('./validatorHelper');

/**
 * Reglas de validación para crear/actualizar una mascota.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasMAscota = [
  // nombre: obligatorio, 2-100 caracteres
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la mascota es obligatorio.')
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres.')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres.'),

  // idCliente: obligatorio, debe existir y estar activo en BD
  body('idCliente')
    .notEmpty().withMessage('El cliente es obligatorio.')
    .isInt({ min: 1 }).withMessage('El cliente seleccionado no es válido.')
    .custom(async (idCliente) => {
      const cliente = await Cliente.findOne({ where: { id: idCliente, estado: 1 } });
      if (!cliente) {
        throw new Error('El cliente seleccionado no existe o no está activo.');
      }
    }),

  // idRaza: obligatorio, debe existir y estar activa en BD
  body('idRaza')
    .notEmpty().withMessage('La raza es obligatoria.')
    .isInt({ min: 1 }).withMessage('La raza seleccionada no es válida.')
    .custom(async (idRaza, { req }) => {
      const raza = await Raza.findOne({ where: { id: idRaza, estado: 1 } });
      if (!raza) {
        throw new Error('La raza seleccionada no existe o no está activa.');
      }

      // Validar que la raza pertenezca a la especie seleccionada (si se envía idEspecie)
      const idEspecie = req.body && req.body.idEspecie ? req.body.idEspecie : null;
      if (idEspecie) {
        if (String(raza.idEspecie) !== String(idEspecie)) {
          throw new Error('La raza seleccionada no pertenece a la especie indicada.');
        }
      }
    }),

  // sexo: opcional, valores permitidos: Macho, Hembra
  body('sexo')
    .trim()
    .optional({ checkFalsy: true })
    .isIn(['Macho', 'Hembra']).withMessage('El sexo debe ser Macho o Hembra.'),

  // fechaNacimiento: opcional, no puede ser futura
  body('fechaNacimiento')
    .optional({ checkFalsy: true })
    .isDate().withMessage('La fecha de nacimiento no tiene un formato válido (YYYY-MM-DD).')
    .custom((valor) => {
      const fecha = new Date(valor);
      const hoy = new Date();
      // Comparar solo la fecha (sin hora) para evitar falsos positivos por zona horaria
      hoy.setHours(23, 59, 59, 999);
      if (fecha > hoy) {
        throw new Error('La fecha de nacimiento no puede ser una fecha futura.');
      }
      return true;
    }),

  // pesoActual: opcional, entre 0.1 y 500 kg
  body('pesoActual')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.1, max: 500 }).withMessage('El peso debe ser un número entre 0.1 y 500 kg.'),

  // color: opcional, máximo 50 caracteres
  body('color')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('El color no puede superar los 50 caracteres.'),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * - AJAX: responde con JSON { success: false, errors: [...] }
 * - Normal: flash + redirect back
 */
const validarMascota = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasMAscota, 'back');

module.exports = { validarMascota };
