const express = require('express');
const router = express.Router();
const { reqAuth } = require('../middlewares/auth');

/**
 * Redirige rutas legacy del menú (/modulo/listar) a las rutas reales del sistema.
 */
const ALIASES = [
  ['/clientes/listar', '/clientes'],
  ['/mascotas/listar', '/mascotas'],
  ['/citas/listar', '/citas'],
  ['/servicios/listar', '/servicios'],
  ['/especies/listar', '/especies'],
  ['/razas/listar', '/razas'],
  ['/productos/listar', '/productos'],
  ['/proveedores/listar', '/proveedores'],
  ['/categorias-productos', '/categorias-productos/listar'],
  ['/categorias-productos/listar', '/categorias-productos/listar'],
  ['/historial/listar', '/historial-clinico'],
  ['/examenes/listar', '/historial-clinico'],
  ['/baños/listar', '/banos/listar'],
  ['/banos/listar', '/banos/listar'],
  ['/ventas/listar', '/ventas'],
  ['/usuarios/listar', '/usuarios'],
  ['/perfiles/listar', '/perfiles/listar'],
  ['/reportes/listar', '/reportes/listar'],
];

ALIASES.forEach(([from, to]) => {
  router.get(from, reqAuth, (req, res) => res.redirect(to));
});

module.exports = router;
