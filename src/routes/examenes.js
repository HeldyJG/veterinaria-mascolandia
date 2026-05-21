const express = require('express');
const router = express.Router();
const ExamenLaboratorioController = require('../controllers/ExamenLaboratorioController');
const { reqAuth } = require('../middlewares/auth');
const { validarExamenLaboratorio } = require('../middlewares/validators/examenLaboratorioValidator');
const { uploadExamen, handleUploadError } = require('../middlewares/upload');

// POST /historial-clinico/:idHistorial/examenes - Registrar nuevo examen de laboratorio
router.post(
  '/historial-clinico/:idHistorial/examenes',
  reqAuth,
  uploadExamen.single('archivo'),
  handleUploadError,
  validarExamenLaboratorio,
  ExamenLaboratorioController.store
);

// GET /examenes-laboratorio/:id/descargar - Descargar archivo adjunto del examen
router.get('/examenes-laboratorio/:id/descargar', reqAuth, ExamenLaboratorioController.descargar);

// DELETE /examenes-laboratorio/:id - Eliminar examen de laboratorio
router.delete('/examenes-laboratorio/:id', reqAuth, ExamenLaboratorioController.destroy);

module.exports = router;
