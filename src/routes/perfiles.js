const express = require('express');
const router = express.Router();
const PerfilController = require('../controllers/PerfilController');
const { reqAuth, checkPermission } = require('../middlewares/auth');

const permisoPerfiles = checkPermission('Gestión de Perfiles');

router.get('/perfiles', reqAuth, permisoPerfiles, (req, res) => res.redirect('/perfiles/listar'));
router.get('/perfiles/listar', reqAuth, permisoPerfiles, PerfilController.index);
router.get('/perfiles/:id/permisos', reqAuth, permisoPerfiles, PerfilController.editPermisos);
router.put('/perfiles/:id/permisos', reqAuth, permisoPerfiles, PerfilController.updatePermisos);

module.exports = router;
