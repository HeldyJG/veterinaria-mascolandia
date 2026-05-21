const express = require('express');
const router = express.Router();
const ReporteController = require('../controllers/ReporteController');
const { reqAuth } = require('../middlewares/auth');

const { checkPermission } = require('../middlewares/auth');
const permisoReportes = checkPermission('Reporte de Ventas');

router.get('/', reqAuth, permisoReportes, (req, res) => res.redirect('/reportes/listar'));
router.get('/listar', reqAuth, permisoReportes, ReporteController.mostrarPagina);
router.get('/api/completo', reqAuth, permisoReportes, ReporteController.obtenerReporteCompleto);
router.get('/api/exportar', reqAuth, permisoReportes, ReporteController.exportar);

module.exports = router;
