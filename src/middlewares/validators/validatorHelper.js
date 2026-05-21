/**
 * Helper compartido para ejecutar validaciones y manejar errores.
 * - Si la request es AJAX (X-Requested-With: XMLHttpRequest): responde con JSON.
 * - Si es request normal: guarda el primer mensaje en flash y redirige.
 */
const { validationResult } = require('express-validator');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {Array} reglas - Array de express-validator chains
 * @param {string} redirectTo - URL de redirección en caso de error (requests normales)
 */
const ejecutarValidacion = async (req, res, next, reglas, redirectTo) => {
  await Promise.all(reglas.map((regla) => regla.run(req)));

  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    const mensajes = errores.array().map((e) => e.msg);

    // Respuesta AJAX para modales y fetch
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(422).json({ success: false, errors: mensajes });
    }

    req.flash('error', mensajes[0]);
    return res.redirect(redirectTo || 'back');
  }

  return next();
};

module.exports = { ejecutarValidacion };
