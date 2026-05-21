const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/ProductoController');
const { reqAuth } = require('../middlewares/auth');
const { validarProducto } = require('../middlewares/validators/productoValidator');

// GET /productos - Listar productos
router.get('/productos', reqAuth, ProductoController.index);

// GET /productos/crear - Formulario de creación (debe ir ANTES de /:id)
router.get('/productos/crear', reqAuth, ProductoController.create);

// POST /productos - Guardar nuevo producto
router.post('/productos', reqAuth, validarProducto, ProductoController.store);

// GET /productos/:id/modal - Fragmento ver/editar en modal
router.get('/productos/:id/modal', reqAuth, ProductoController.modal);

// GET /productos/:id - Detalle de producto
router.get('/productos/:id', reqAuth, ProductoController.show);

// GET /productos/:id/editar - Formulario de edición
router.get('/productos/:id/editar', reqAuth, ProductoController.edit);

// PUT /productos/:id - Actualizar producto
router.put('/productos/:id', reqAuth, validarProducto, ProductoController.update);

// DELETE /productos/:id - Eliminar producto (soft delete)
router.delete('/productos/:id', reqAuth, ProductoController.destroy);

// PUT /productos/:id/stock - Actualizar stock del producto
router.put('/productos/:id/stock', reqAuth, ProductoController.updateStock);

// GET /api/productos/buscar - API para búsqueda de productos (punto de venta)
router.get('/api/productos/buscar', reqAuth, ProductoController.buscar);

module.exports = router;
