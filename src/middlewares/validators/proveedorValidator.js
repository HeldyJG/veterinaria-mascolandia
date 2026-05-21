const { body, validationResult } = require('express-validator');
const Proveedor = require('../../models/Proveedor');
const { ejecutarValidacion } = require('./validatorHelper');

/**
 * Reglas de validación para crear/actualizar un proveedor.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasProveedor = [
  // nombreEmpresa: obligatorio, 3-150 caracteres
  body('nombreEmpresa')
    .trim()
    .notEmpty().withMessage('El nombre de la empresa es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre de la empresa debe tener al menos 3 caracteres.')
    .isLength({ max: 150 }).withMessage('El nombre de la empresa no puede superar los 150 caracteres.'),

  // ruc: opcional, exactamente 11 caracteres numéricos, único en BD
  body('ruc')
    .trim()
    .optional({ checkFalsy: true })
    .matches(/^\d+$/).withMessage('El RUC solo puede contener dígitos numéricos.')
    .isLength({ min: 11, max: 11 }).withMessage('El RUC debe tener exactamente 11 dígitos.')
    .custom(async (valor, { req }) => {
      // Verificar unicidad excluyendo el registro actual en actualizaciones
      const idActual = req.params && req.params.id ? req.params.id : null;
      const where = { ruc: valor };

      const proveedorExistente = await Proveedor.findOne({ where });

      if (proveedorExistente) {
        // Si encontramos un proveedor con ese RUC y no es el mismo que estamos editando
        if (!idActual || String(proveedorExistente.id) !== String(idActual)) {
          throw new Error('El RUC ingresado ya está registrado en el sistema.');
        }
      }
    }),

  // direccion: opcional, máximo 255 caracteres
  body('direccion')
    .trim()
    .optional({ checkFalsy: true })
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
const validarProveedor = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasProveedor, 'back');

module.exports = { validarProveedor };
