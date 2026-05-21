const express = require('express');
const router = express.Router();
const ProveedorController = require('../controllers/ProveedorController');
const { reqAuth } = require('../middlewares/auth');
const { validarProveedor } = require('../middlewares/validators/proveedorValidator');

// GET /proveedores — Listar proveedores
router.get('/proveedores', reqAuth, ProveedorController.index);

// GET /proveedores/crear — Formulario de creación (ANTES de /:id)
router.get('/proveedores/crear', reqAuth, ProveedorController.create);

// POST /proveedores — Guardar nuevo proveedor
router.post('/proveedores', reqAuth, validarProveedor, ProveedorController.store);

// GET /proveedores/:id — Ver detalle del proveedor
router.get('/proveedores/:id', reqAuth, ProveedorController.show);

// GET /proveedores/:id/editar — Formulario de edición
router.get('/proveedores/:id/editar', reqAuth, ProveedorController.edit);

// PUT /proveedores/:id — Actualizar proveedor
router.put('/proveedores/:id', reqAuth, validarProveedor, ProveedorController.update);

// DELETE /proveedores/:id — Desactivar proveedor (soft delete)
router.delete('/proveedores/:id', reqAuth, ProveedorController.destroy);

module.exports = router;
