const { body, validationResult } = require('express-validator');
const Cliente = require('../../models/Cliente');
const { ejecutarValidacion } = require('./validatorHelper');

/**
 * Reglas de validación para crear/actualizar un cliente.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasCliente = [
  // nombreCompleto: obligatorio, 3-150 caracteres
  body('nombreCompleto')
    .trim()
    .notEmpty().withMessage('El nombre completo es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre completo debe tener al menos 3 caracteres.')
    .isLength({ max: 150 }).withMessage('El nombre completo no puede superar los 150 caracteres.'),

  // dni: opcional, 8-15 caracteres alfanuméricos, único en BD
  body('dni')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('El DNI debe tener al menos 8 caracteres.')
    .isLength({ max: 15 }).withMessage('El DNI no puede superar los 15 caracteres.')
    .isAlphanumeric().withMessage('El DNI solo puede contener letras y números.')
    .custom(async (valor, { req }) => {
      // Verificar unicidad excluyendo el registro actual en actualizaciones
      const idActual = req.params && req.params.id ? req.params.id : null;
      const where = { dni: valor };

      const clienteExistente = await Cliente.findOne({ where });

      if (clienteExistente) {
        // Si encontramos un cliente con ese DNI y no es el mismo que estamos editando
        if (!idActual || String(clienteExistente.id) !== String(idActual)) {
          throw new Error('El DNI ingresado ya está registrado en el sistema.');
        }
      }
    }),

  // direccion: obligatorio, máximo 255 caracteres
  body('direccion')
    .trim()
    .notEmpty().withMessage('La dirección es obligatoria.')
    .isLength({ max: 255 }).withMessage('La dirección no puede superar los 255 caracteres.'),

  // telefono: obligatorio, 7-20 dígitos numéricos
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio.')
    .matches(/^\d+$/).withMessage('El teléfono solo puede contener dígitos numéricos.')
    .isLength({ min: 7 }).withMessage('El teléfono debe tener al menos 7 dígitos.')
    .isLength({ max: 20 }).withMessage('El teléfono no puede superar los 20 dígitos.'),

  // correo: opcional, formato email válido
  body('correo')
    .trim()
    .optional({ checkFalsy: true })
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * - AJAX: responde con JSON { success: false, errors: [...] }
 * - Normal: flash + redirect back
 */
const validarCliente = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasCliente, 'back');

module.exports = { validarCliente };
