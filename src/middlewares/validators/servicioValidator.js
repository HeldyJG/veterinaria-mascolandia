const { body, validationResult } = require('express-validator');
const Servicio = require('../../models/Servicio');

/**
 * Reglas de validación para crear/actualizar un servicio.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasServicio = [
  // nombre: obligatorio, único en BD, 3-150 caracteres
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del servicio es obligatorio.')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres.')
    .isLength({ max: 150 }).withMessage('El nombre no puede superar los 150 caracteres.')
    .custom(async (valor, { req }) => {
      // Verificar unicidad excluyendo el registro actual en actualizaciones
      const idActual = req.params && req.params.id ? req.params.id : null;

      const servicioExistente = await Servicio.findOne({ where: { nombre: valor } });

      if (servicioExistente) {
        // Si encontramos un servicio con ese nombre y no es el mismo que estamos editando
        if (!idActual || String(servicioExistente.id) !== String(idActual)) {
          throw new Error('Ya existe un servicio registrado con ese nombre.');
        }
      }
    }),

  // descripcion: opcional, máximo 500 caracteres
  body('descripcion')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('La descripción no puede superar los 500 caracteres.'),

  // precio: obligatorio, número mayor a 0
  body('precio')
    .notEmpty().withMessage('El precio es obligatorio.')
    .isFloat({ gt: 0 }).withMessage('El precio debe ser un número mayor a 0.'),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * Si hay errores: guarda el primer mensaje en flash y redirige al formulario anterior.
 * Si no hay errores: llama a next() para continuar con el controlador.
 */
const validarServicio = async (req, res, next) => {
  // Ejecutar todas las reglas de validación
  await Promise.all(reglasServicio.map((regla) => regla.run(req)));

  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    // Recoger todos los mensajes de error
    const mensajes = errores.array().map((e) => e.msg);

    // Enviar el primer error como flash y redirigir al formulario anterior
    req.flash('error', mensajes[0]);
    return res.redirect('back');
  }

  return next();
};

module.exports = { validarServicio };
