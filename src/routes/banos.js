const express = require('express');
const router = express.Router();
const BanoController = require('../controllers/BanoController');
const { reqAuth } = require('../middlewares/auth');

// Ruta principal para renderizar la vista
router.get('/listar', reqAuth, BanoController.mostrarPagina);

// Rutas de API (rutas fijas antes de parámetros dinámicos)
router.get('/api/listar', reqAuth, BanoController.listarTodos);
router.get('/api/stock', reqAuth, BanoController.obtenerStock);
router.post('/api/guardar', reqAuth, BanoController.guardar);
router.post('/api/reponer/:tipo', reqAuth, BanoController.reponerStock);
router.post('/api/cambiar-estado/:id', reqAuth, BanoController.cambiarEstado);
router.delete('/api/eliminar/:id', reqAuth, BanoController.eliminar);
router.get('/api/:id', reqAuth, BanoController.obtenerPorId);

module.exports = router;
