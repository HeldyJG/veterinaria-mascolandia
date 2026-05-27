const express = require('express');
const router = express.Router();
const RazaController = require('../controllers/RazaController');
const { reqAuth } = require('../middlewares/auth');
const { validarRaza } = require('../middlewares/validators/razaValidator');

// GET /razas - Listar razas
router.get('/razas', reqAuth, RazaController.index);

// POST /razas - Crear raza
router.post('/razas', reqAuth, validarRaza, RazaController.store);

// PUT /razas/:id - Actualizar raza
router.put('/razas/:id', reqAuth, validarRaza, RazaController.update);

// DELETE /razas/:id - Desactivar raza
router.delete('/razas/:id', reqAuth, RazaController.destroy);

// GET /api/razas/search - API: búsqueda predictiva de razas (autocomplete)
router.get('/api/razas/search', reqAuth, RazaController.search);

// GET /api/razas/:idEspecie - API: obtener razas por especie (JSON)
router.get('/api/razas/:idEspecie', reqAuth, RazaController.porEspecie);

module.exports = router;
