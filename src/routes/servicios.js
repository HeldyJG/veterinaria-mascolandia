const express = require('express');
const router = express.Router();
const ServicioController = require('../controllers/ServicioController');
const { reqAuth } = require('../middlewares/auth');
const { validarServicio } = require('../middlewares/validators/servicioValidator');

// GET /servicios — Listar servicios
router.get('/servicios', reqAuth, ServicioController.index);

// GET /servicios/crear — Formulario de creación (ANTES de /:id)
router.get('/servicios/crear', reqAuth, ServicioController.create);

// POST /servicios — Guardar nuevo servicio
router.post('/servicios', reqAuth, validarServicio, ServicioController.store);

// GET /servicios/:id/editar — Formulario de edición
router.get('/servicios/:id/editar', reqAuth, ServicioController.edit);

// PUT /servicios/:id — Actualizar servicio
router.put('/servicios/:id', reqAuth, validarServicio, ServicioController.update);

// DELETE /servicios/:id — Eliminar servicio (soft delete)
router.delete('/servicios/:id', reqAuth, ServicioController.destroy);

// GET /api/servicios/search - API: búsqueda predictiva de servicios (autocomplete)
router.get('/api/servicios/search', reqAuth, ServicioController.search);

module.exports = router;
