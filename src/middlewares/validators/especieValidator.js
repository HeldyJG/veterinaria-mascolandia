const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Especie = require('../../models/Especie');

/**
 * Reglas de validación para crear/actualizar una especie.
 * Se espera que req.params.id exista en actualizaciones (para excluir el registro actual).
 */
const especieValidationRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la especie es obligatorio.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
    .custom(async (nombre, { req }) => {
      const id = req.params && req.params.id ? req.params.id : null;

      const where = {
        nombre: { [Op.iLike]: nombre.trim() },
      };

      if (id) {
        where.id = { [Op.ne]: id };
      }

      const existe = await Especie.findOne({ where });
      if (existe) {
        throw new Error('Ya existe una especie con ese nombre.');
      }
    }),
];

/**
 * Middleware que ejecuta las validaciones y redirige con flash si hay errores.
 */
const validarEspecie = async (req, res, next) => {
  // Ejecutar todas las reglas
  await Promise.all(especieValidationRules.map(rule => rule.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mensajes = errors.array().map(e => e.msg);
    req.flash('error', mensajes.join(' '));
    return res.redirect('back');
  }

  next();
};

module.exports = { validarEspecie, especieValidationRules };
