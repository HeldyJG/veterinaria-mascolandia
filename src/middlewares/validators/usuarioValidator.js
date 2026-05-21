const { body, validationResult } = require('express-validator');
const Usuario = require('../../models/Usuario');
const Perfil = require('../../models/Perfil');

const reglaNombre = body('nombre')
  .trim()
  .notEmpty().withMessage('El nombre es obligatorio.')
  .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres.');

const reglaUsuario = body('usuario')
  .trim()
  .notEmpty().withMessage('El nombre de usuario es obligatorio.')
  .isLength({ min: 4, max: 50 }).withMessage('El usuario debe tener entre 4 y 50 caracteres.')
  .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede contener letras, números y . _ -')
  .custom(async (valor, { req }) => {
    const idActual = req.params?.id || null;
    const existente = await Usuario.findOne({ where: { usuario: valor } });
    if (existente && (!idActual || String(existente.id) !== String(idActual))) {
      throw new Error('Este nombre de usuario ya está registrado.');
    }
  });

const reglaCorreo = body('correo')
  .trim()
  .optional({ checkFalsy: true })
  .isEmail().withMessage('El correo no tiene un formato válido.')
  .normalizeEmail()
  .custom(async (valor, { req }) => {
    if (!valor) return true;
    const idActual = req.params?.id || null;
    const existente = await Usuario.findOne({ where: { correo: valor } });
    if (existente && (!idActual || String(existente.id) !== String(idActual))) {
      throw new Error('Este correo ya está registrado.');
    }
  });

const reglaPerfil = body('idPerfil')
  .notEmpty().withMessage('Debe seleccionar un perfil.')
  .isInt({ min: 1 }).withMessage('El perfil seleccionado no es válido.')
  .custom(async (valor) => {
    const perfil = await Perfil.findOne({ where: { id: valor, estado: 1 } });
    if (!perfil) {
      throw new Error('El perfil seleccionado no existe o no está activo.');
    }
  });

const reglaClaveCreacion = body('clave')
  .notEmpty().withMessage('La contraseña es obligatoria.')
  .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
  .matches(/[A-Za-z]/).withMessage('La contraseña debe incluir al menos una letra.')
  .matches(/\d/).withMessage('La contraseña debe incluir al menos un número.');

const reglasUsuarioCreacion = [reglaNombre, reglaUsuario, reglaCorreo, reglaPerfil, reglaClaveCreacion];

const reglasUsuarioActualizacion = [reglaNombre, reglaUsuario, reglaCorreo, reglaPerfil];

const reglasCambioClave = [
  body('claveNueva')
    .notEmpty().withMessage('La nueva contraseña es obligatoria.')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Za-z]/).withMessage('La nueva contraseña debe incluir al menos una letra.')
    .matches(/\d/).withMessage('La nueva contraseña debe incluir al menos un número.'),
  body('claveConfirmacion')
    .notEmpty().withMessage('Debe confirmar la nueva contraseña.')
    .custom((valor, { req }) => {
      if (valor !== req.body.claveNueva) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
  body('claveActual')
    .optional({ checkFalsy: true })
    .isLength({ min: 1 }).withMessage('Ingrese su contraseña actual.'),
];

async function ejecutarValidacion(req, res, next, reglas, redirectTo) {
  await Promise.all(reglas.map((regla) => regla.run(req)));
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    req.flash('error', errores.array()[0].msg);
    return res.redirect(redirectTo);
  }
  return next();
}

const validarUsuarioCreacion = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasUsuarioCreacion, '/usuarios/crear');

const validarUsuarioActualizacion = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasUsuarioActualizacion, `/usuarios/${req.params.id}/editar`);

const validarCambioClave = (req, res, next) =>
  ejecutarValidacion(req, res, next, reglasCambioClave, `/usuarios/${req.params.id}/cambiar-clave`);

module.exports = {
  validarUsuarioCreacion,
  validarUsuarioActualizacion,
  validarCambioClave,
};
