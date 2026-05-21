const express = require('express');
const router = express.Router();
const HistorialClinicoController = require('../controllers/HistorialClinicoController');
const historialClinicoValidator = require('../middlewares/validators/historialClinicoValidator');
const { reqAuth } = require('../middlewares/auth');

router.get('/historial-clinico', reqAuth, HistorialClinicoController.index);
router.get('/historial-clinico/crear', reqAuth, HistorialClinicoController.create);
router.post('/historial-clinico', reqAuth, historialClinicoValidator.validarHistorialClinico, HistorialClinicoController.store);
router.get('/historial-clinico/:id', reqAuth, HistorialClinicoController.show);
router.get('/historial-clinico/:id/editar', reqAuth, HistorialClinicoController.edit);
router.put('/historial-clinico/:id', reqAuth, historialClinicoValidator.validarHistorialClinico, HistorialClinicoController.update);
router.delete('/historial-clinico/:id', reqAuth, HistorialClinicoController.destroy);

router.get('/mascotas/:id/historial', reqAuth, HistorialClinicoController.historialMascota);

module.exports = router;
