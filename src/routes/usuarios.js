const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { reqAuth, checkPermission } = require('../middlewares/auth');

const permisoUsuarios = checkPermission('Gestión de Usuarios');
const {
  validarUsuarioCreacion,
  validarUsuarioActualizacion,
  validarCambioClave,
} = require('../middlewares/validators/usuarioValidator');

router.get('/usuarios', reqAuth, permisoUsuarios, UsuarioController.index);
router.get('/usuarios/crear', reqAuth, permisoUsuarios, UsuarioController.create);
router.post('/usuarios', reqAuth, permisoUsuarios, validarUsuarioCreacion, UsuarioController.store);
router.get('/usuarios/:id/cambiar-clave', reqAuth, permisoUsuarios, UsuarioController.cambiarClaveForm);
router.put('/usuarios/:id/cambiar-clave', reqAuth, permisoUsuarios, validarCambioClave, UsuarioController.cambiarClave);
router.get('/usuarios/:id/editar', reqAuth, permisoUsuarios, UsuarioController.edit);
router.put('/usuarios/:id', reqAuth, permisoUsuarios, validarUsuarioActualizacion, UsuarioController.update);
router.post('/usuarios/:id/desactivar', reqAuth, permisoUsuarios, UsuarioController.destroy);
router.delete('/usuarios/:id', reqAuth, permisoUsuarios, UsuarioController.destroy);

// GET /api/usuarios/search - API: búsqueda predictiva de usuarios/veterinarios (autocomplete)
router.get('/api/usuarios/search', reqAuth, UsuarioController.search);

module.exports = router;
