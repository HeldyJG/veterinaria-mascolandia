const express = require('express');
const router = express.Router();
const MascotaController = require('../controllers/MascotaController');
const { reqAuth } = require('../middlewares/auth');
const { validarMascota } = require('../middlewares/validators/mascotaValidator');
const { uploadFoto, handleUploadError } = require('../middlewares/upload');

// GET /mascotas - Listar mascotas
router.get('/mascotas', reqAuth, MascotaController.index);

// GET /mascotas/crear - Formulario de creación (debe ir ANTES de /:id)
router.get('/mascotas/crear', reqAuth, MascotaController.create);

// POST /mascotas - Guardar nueva mascota (con subida de foto)
router.post('/mascotas', reqAuth, uploadFoto.single('foto'), handleUploadError, validarMascota, MascotaController.store);

// GET /mascotas/:id/modal - Fragmento ver/editar en modal
router.get('/mascotas/:id/modal', reqAuth, MascotaController.modal);

// GET /mascotas/:id - Detalle de mascota
router.get('/mascotas/:id', reqAuth, MascotaController.show);

// GET /mascotas/:id/editar - Formulario de edición
router.get('/mascotas/:id/editar', reqAuth, MascotaController.edit);

// PUT /mascotas/:id - Actualizar mascota (con subida de foto)
router.put('/mascotas/:id', reqAuth, uploadFoto.single('foto'), handleUploadError, validarMascota, MascotaController.update);

// DELETE /mascotas/:id - Eliminar mascota (soft delete)
router.delete('/mascotas/:id', reqAuth, MascotaController.destroy);

// GET /api/mascotas/razas/:idEspecie - API: razas activas por especie (carga dinámica AJAX)
router.get('/api/mascotas/razas/:idEspecie', reqAuth, MascotaController.getRazasByEspecie);

// GET /api/mascotas/search - API: búsqueda predictiva de mascotas (autocomplete)
router.get('/api/mascotas/search', reqAuth, MascotaController.search);

module.exports = router;
