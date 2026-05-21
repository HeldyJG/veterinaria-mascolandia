const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/VentaController');
const { reqAuth, checkPermission } = require('../middlewares/auth');

const permisoVentas = checkPermission('Ventas');
const { validarVenta } = require('../middlewares/validators/ventaValidator');

router.get('/ventas', reqAuth, VentaController.index);
router.get('/ventas/crear', reqAuth, VentaController.create);
router.post('/ventas', reqAuth, permisoVentas, validarVenta, VentaController.store);
router.get('/ventas/:id/imprimir', reqAuth, VentaController.imprimir);
router.get('/ventas/:id/modal', reqAuth, VentaController.modal);
router.get('/ventas/:id', reqAuth, VentaController.show);
router.put('/ventas/:id/anular', reqAuth, permisoVentas, VentaController.anular);

module.exports = router;
