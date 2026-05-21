const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const CategoriaProducto = require('../../models/CategoriaProducto');

/**
 * Reglas de validación para crear/actualizar una categoría de producto.
 * Se usa en rutas POST (crear) y PUT/PATCH (actualizar).
 * Para updates, el id del registro actual debe estar en req.params.id
 * para excluirlo de la validación de unicidad.
 */
const categoriaProductoRules = [
  // nombre: obligatorio, 3-100 caracteres, único en BD
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la categoría es obligatorio.')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres.')
    .custom(async (nombre, { req }) => {
      const idActual = req.params && req.params.id ? req.params.id : null;

      const where = { nombre };
      if (idActual) {
        where.id = { [Op.ne]: idActual };
      }

      const existe = await CategoriaProducto.findOne({ where });
      if (existe) {
        throw new Error('Ya existe una categoría con ese nombre.');
      }
      return true;
    }),

  // descripcion: opcional, máximo 255 caracteres
  body('descripcion')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres.'),
];

/**
 * Middleware que ejecuta las validaciones y, si hay errores,
 * guarda el primer mensaje en flash y redirige atrás.
 * Si no hay errores, llama a next().
 */
const validarCategoriaProducto = async (req, res, next) => {
  // Ejecutar todas las reglas de validación
  await Promise.all(categoriaProductoRules.map(rule => rule.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const primerError = errors.array()[0].msg;
    req.flash('error', primerError);
    return res.redirect('back');
  }

  next();
};

module.exports = {
  categoriaProductoRules,
  validarCategoriaProducto,
};
