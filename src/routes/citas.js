const express = require('express');
const router = express.Router();
const CitaController = require('../controllers/CitaController');
const { reqAuth } = require('../middlewares/auth');
const { validarCita, validarCitaUpdate } = require('../middlewares/validators/citaValidator');

// GET /citas - Listar citas
router.get('/citas', reqAuth, CitaController.index);

// GET /citas/crear - Formulario de creación (debe ir ANTES de /:id)
router.get('/citas/crear', reqAuth, CitaController.create);

// POST /citas - Guardar nueva cita
router.post('/citas', reqAuth, validarCita, CitaController.store);

// GET /citas/:id/modal - Fragmento ver/editar en modal
router.get('/citas/:id/modal', reqAuth, CitaController.modal);

// GET /citas/:id - Detalle de cita
router.get('/citas/:id', reqAuth, CitaController.show);

// GET /citas/:id/editar - Formulario de edición
router.get('/citas/:id/editar', reqAuth, CitaController.edit);

// PUT /citas/:id - Actualizar cita
router.put('/citas/:id', reqAuth, validarCitaUpdate, CitaController.update);

// DELETE /citas/:id - Cancelar cita
router.delete('/citas/:id', reqAuth, CitaController.destroy);

// PUT /citas/:id/confirmar - Confirmar cita
router.put('/citas/:id/confirmar', reqAuth, CitaController.confirmar);

// PUT /citas/:id/atender - Marcar cita como atendida
router.put('/citas/:id/atender', reqAuth, CitaController.atender);

// POST /api/citas/express - Registro exprés (cliente + mascota + cita en una transacción)
router.post('/api/citas/express', reqAuth, CitaController.expressStore);

module.exports = router;