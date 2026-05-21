const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Especie = require('../../models/Especie');
const Raza = require('../../models/Raza');

/**
 * Reglas de validación para crear/actualizar una raza.
 * Se espera que req.params.id exista en actualizaciones (para excluir el registro actual).
 */
const razaValidationRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la raza es obligatorio.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),

  body('idEspecie')
    .notEmpty().withMessage('La especie es obligatoria.')
    .isInt({ min: 1 }).withMessage('La especie seleccionada no es válida.')
    .custom(async (idEspecie) => {
      const especie = await Especie.findByPk(idEspecie);
      if (!especie) {
        throw new Error('La especie seleccionada no existe.');
      }
    }),

  // Unicidad: misma especie no puede tener dos razas con el mismo nombre
  body('nombre')
    .trim()
    .custom(async (nombre, { req }) => {
      const idEspecie = req.body && req.body.idEspecie ? req.body.idEspecie : null;
      const id = req.params && req.params.id ? req.params.id : null;

      if (!idEspecie || !nombre) return; // Las otras reglas ya cubren estos casos

      const where = {
        nombre: { [Op.iLike]: nombre.trim() },
        idEspecie,
      };

      if (id) {
        where.id = { [Op.ne]: id };
      }

      const existe = await Raza.findOne({ where });
      if (existe) {
        throw new Error('Ya existe una raza con ese nombre para la especie seleccionada.');
      }
    }),
];

/**
 * Middleware que ejecuta las validaciones y redirige con flash si hay errores.
 */
const validarRaza = async (req, res, next) => {
  // Ejecutar todas las reglas
  await Promise.all(razaValidationRules.map(rule => rule.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mensajes = errors.array().map(e => e.msg);
    req.flash('error', mensajes.join(' '));
    return res.redirect('back');
  }

  next();
};

module.exports = { validarRaza, razaValidationRules };
