const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Producto = require('../../models/Producto');
const CategoriaProducto = require('../../models/CategoriaProducto');
const Proveedor = require('../../models/Proveedor');
const { ejecutarValidacion } = require('./validatorHelper');

/**
 * Reglas de validación para crear/actualizar un producto.
 * Se usa en rutas POST (store) y PUT (update).
 * Para updates, el id del registro actual debe estar en req.params.id
 * para excluirlo de la validación de unicidad de codigoBarras.
 */
const reglasProducto = [
  // nombre: obligatorio, 3-150 caracteres
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del producto es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres.')
    .isLength({ max: 150 }).withMessage('El nombre no puede superar los 150 caracteres.'),

  // codigoBarras: opcional, 8-50 caracteres, único en BD
  body('codigoBarras')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('El código de barras debe tener al menos 8 caracteres.')
    .isLength({ max: 50 }).withMessage('El código de barras no puede superar los 50 caracteres.')
    .custom(async (valor, { req }) => {
      // Verificar unicidad excluyendo el registro actual en actualizaciones
      const idActual = req.params && req.params.id ? req.params.id : null;
      const where = { codigoBarras: valor };
      if (idActual) {
        where.id = { [Op.ne]: idActual };
      }

      const productoExistente = await Producto.findOne({ where });
      if (productoExistente) {
        throw new Error('El código de barras ingresado ya está registrado en el sistema.');
      }
      return true;
    }),

  // idCategoria: obligatorio, debe existir en BD con estado=1
  body('idCategoria')
    .notEmpty().withMessage('La categoría del producto es obligatoria.')
    .isInt({ min: 1 }).withMessage('La categoría seleccionada no es válida.')
    .custom(async (valor) => {
      const categoria = await CategoriaProducto.findOne({
        where: { id: valor, estado: 1 },
      });
      if (!categoria) {
        throw new Error('La categoría seleccionada no existe o no está activa.');
      }
      return true;
    }),

  // idProveedor: opcional, si se envía debe existir en BD con estado=1
  body('idProveedor')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('El proveedor seleccionado no es válido.')
    .custom(async (valor) => {
      const proveedor = await Proveedor.findOne({
        where: { id: valor, estado: 1 },
      });
      if (!proveedor) {
        throw new Error('El proveedor seleccionado no existe o no está activo.');
      }
      return true;
    }),

  // precioCompra: obligatorio, mayor a 0
  body('precioCompra')
    .notEmpty().withMessage('El precio de compra es obligatorio.')
    .isFloat({ gt: 0 }).withMessage('El precio de compra debe ser un número mayor a 0.'),

  // precioVenta: obligatorio, mayor a 0, >= precioCompra
  body('precioVenta')
    .notEmpty().withMessage('El precio de venta es obligatorio.')
    .isFloat({ gt: 0 }).withMessage('El precio de venta debe ser un número mayor a 0.')
    .custom((valor, { req }) => {
      const precioCompra = parseFloat(req.body.precioCompra);
      const precioVenta = parseFloat(valor);
      if (!isNaN(precioCompra) && precioVenta < precioCompra) {
        throw new Error('El precio de venta debe ser mayor o igual al precio de compra.');
      }
      return true;
    }),

  // stockActual: obligatorio, entero no negativo
  body('stockActual')
    .notEmpty().withMessage('El stock actual es obligatorio.')
    .isInt({ min: 0 }).withMessage('El stock actual debe ser un número entero no negativo.'),

  // stockMinimo: obligatorio, entero no negativo
  body('stockMinimo')
    .notEmpty().withMessage('El stock mínimo es obligatorio.')
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero no negativo.'),

  // descripcion: opcional, máximo 500 caracteres
  body('descripcion')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('La descripción no puede superar los 500 caracteres.'),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * - AJAX: responde con JSON { success: false, errors: [...] }
 * - Normal: flash + redirect back
 */
const validarProducto = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasProducto, 'back');

module.exports = { validarProducto };
