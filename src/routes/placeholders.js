const express = require('express');
const router = express.Router();
const { reqAuth } = require('../middlewares/auth');

const paths = [
  '/mascotas/listar',
  '/razas/listar',
  '/citas/listar',
  '/clientes/listar',
  '/historial/listar',
  '/consulta/listar',
  '/vacunacion/listar',
  '/examenes/listar',
  '/proveedores/listar',
  '/caja/listar',
  '/especies/listar',
  '/categorias-productos/listar',
  '/servicios/listar'
];

paths.forEach(p => {
  router.get(p, reqAuth, (req, res) => {
    // Determinar un nombre amigable basado en la ruta
    let modulo = 'Módulo';
    if (p.includes('usuarios')) modulo = 'Gestión de Usuarios';
    else if (p.includes('perfiles')) modulo = 'Gestión de Perfiles';
    else if (p.includes('mascotas')) modulo = 'Gestión de Mascotas';
    else if (p.includes('razas')) modulo = 'Gestión de Razas';
    else if (p.includes('citas')) modulo = 'Gestión de Citas';
    else if (p.includes('clientes')) modulo = 'Gestión de Clientes';
    else if (p.includes('historial')) modulo = 'Historias Clínicas';
    else if (p.includes('consulta')) modulo = 'Consultas y Tratamientos';
    else if (p.includes('vacunacion')) modulo = 'Vacunación y Desparasitación';
    else if (p.includes('examenes')) modulo = 'Exámenes de Laboratorio';
    else if (p.includes('productos')) modulo = 'Gestión de Productos';
    else if (p.includes('proveedores')) modulo = 'Gestión de Proveedores';
    else if (p.includes('ventas')) modulo = 'Módulo de Ventas';
    else if (p.includes('caja')) modulo = 'Caja Chica';
    else if (p.includes('especies')) modulo = 'Gestión de Especies';
    else if (p.includes('categorias-productos')) modulo = 'Categorías de Productos';
    else if (p.includes('servicios')) modulo = 'Gestión de Servicios';

    res.render('en-construccion', {
      title: `${modulo} | Mascolandia`,
      pageTitle: `${modulo} (Próximamente)`,
      activePage: p
    });
  });
});

module.exports = router;
