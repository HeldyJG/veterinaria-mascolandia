const express = require('express');
const router = express.Router();
const CategoriaProductoController = require('../controllers/CategoriaProductoController');
const { reqAuth } = require('../middlewares/auth');
const { validarCategoriaProducto } = require('../middlewares/validators/categoriaProductoValidator');

// GET /categorias-productos → redirige al listado canónico
router.get('/categorias-productos', reqAuth, (req, res) =>
  res.redirect('/categorias-productos/listar')
);

// GET /categorias-productos/listar → Listar todas las categorías
router.get('/categorias-productos/listar', reqAuth, CategoriaProductoController.index);

// POST /categorias-productos → Crear nueva categoría
router.post('/categorias-productos', reqAuth, validarCategoriaProducto, CategoriaProductoController.store);

// PUT /categorias-productos/:id → Actualizar categoría
router.put('/categorias-productos/:id', reqAuth, validarCategoriaProducto, CategoriaProductoController.update);

// DELETE /categorias-productos/:id → Eliminar (soft delete) categoría
router.delete('/categorias-productos/:id', reqAuth, CategoriaProductoController.destroy);

module.exports = router;
