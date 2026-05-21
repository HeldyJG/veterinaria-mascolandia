const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');
const { reqAuth, checkPermission } = require('../middlewares/auth');

const permisoClientes = checkPermission('Clientes');
const { validarCliente } = require('../middlewares/validators/clienteValidator');

// GET /clientes - Listar clientes
router.get('/clientes', reqAuth, ClienteController.index);

// GET /clientes/crear - Formulario de creación (debe ir ANTES de /:id)
router.get('/clientes/crear', reqAuth, ClienteController.create);

// POST /clientes - Guardar nuevo cliente
router.post('/clientes', reqAuth, permisoClientes, validarCliente, ClienteController.store);

// GET /clientes/:id/modal - Fragmento ver/editar en modal
router.get('/clientes/:id/modal', reqAuth, ClienteController.modal);

// GET /clientes/:id - Detalle de cliente
router.get('/clientes/:id', reqAuth, ClienteController.show);

// GET /clientes/:id/editar - Formulario de edición
router.get('/clientes/:id/editar', reqAuth, ClienteController.edit);

// PUT /clientes/:id - Actualizar cliente
router.put('/clientes/:id', reqAuth, permisoClientes, validarCliente, ClienteController.update);

// DELETE /clientes/:id - Eliminar cliente (soft delete)
router.delete('/clientes/:id', reqAuth, permisoClientes, ClienteController.destroy);

module.exports = router;
