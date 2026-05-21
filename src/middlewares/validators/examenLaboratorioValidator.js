const { body, validationResult } = require('express-validator');
const HistorialClinico = require('../../models/HistorialClinico');

/**
 * Reglas de validación para crear/actualizar un examen de laboratorio.
 * Se usa en rutas POST (store) y PUT (update).
 */
const reglasExamenLaboratorio = [
  // idHistorial: obligatorio, debe existir en BD con estado=1
  body('idHistorial')
    .trim()
    .notEmpty().withMessage('El historial clínico es obligatorio.')
    .isInt({ min: 1 }).withMessage('El historial clínico debe ser un identificador válido.')
    .custom(async (valor) => {
      const historial = await HistorialClinico.findOne({
        where: { id: valor, estado: 1 },
      });

      if (!historial) {
        throw new Error('El historial clínico no existe o no está activo.');
      }
    }),

  // tipoExamen: obligatorio, máximo 100 caracteres
  body('tipoExamen')
    .trim()
    .notEmpty().withMessage('El tipo de examen es obligatorio.')
    .isLength({ max: 100 }).withMessage('El tipo de examen no puede superar los 100 caracteres.'),

  // descripcion: opcional, máximo 1000 caracteres
  body('descripcion')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('La descripción no puede superar los 1000 caracteres.'),

  // archivo: requerido en creación (req.file debe existir)
  body('archivo').custom((valor, { req }) => {
    // Solo validar en creación (POST sin id en params)
    const esCreacion = !(req.params && req.params.id);

    if (esCreacion && !req.file) {
      throw new Error('El archivo del examen es obligatorio.');
    }

    return true;
  }),
];

/**
 * Middleware que ejecuta las validaciones y maneja los errores.
 * Si hay errores: guarda el primer mensaje en flash y redirige al formulario anterior.
 * Si no hay errores: llama a next() para continuar con el controlador.
 */
const validarExamenLaboratorio = async (req, res, next) => {
  if (req.params.idHistorial && !req.body.idHistorial) {
    req.body.idHistorial = req.params.idHistorial;
  }

  // Ejecutar todas las reglas de validación
  await Promise.all(reglasExamenLaboratorio.map((regla) => regla.run(req)));

  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    // Recoger todos los mensajes de error
    const mensajes = errores.array().map((e) => e.msg);

    // Enviar el primer error como flash y redirigir al formulario anterior
    req.flash('error', mensajes[0]);
    const destino = req.params.idHistorial
      ? `/historial-clinico/${req.params.idHistorial}`
      : 'back';
    return res.redirect(destino);
  }

  return next();
};

module.exports = { validarExamenLaboratorio };
