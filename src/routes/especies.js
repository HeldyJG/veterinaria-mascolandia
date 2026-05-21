const express = require('express');
const router = express.Router();
const EspecieController = require('../controllers/EspecieController');
const { reqAuth } = require('../middlewares/auth');
const { validarEspecie } = require('../middlewares/validators/especieValidator');

// GET /especies - Listar especies
router.get('/especies', reqAuth, EspecieController.index);

// POST /especies - Crear especie
router.post('/especies', reqAuth, validarEspecie, EspecieController.store);

// PUT /especies/:id - Actualizar especie
router.put('/especies/:id', reqAuth, validarEspecie, EspecieController.update);

// DELETE /especies/:id - Desactivar especie
router.delete('/especies/:id', reqAuth, EspecieController.destroy);

module.exports = router;
