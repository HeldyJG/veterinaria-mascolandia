require('dotenv').config();
const {
  buildPermisosRutas,
  tieneAccesoRuta,
  normalizarRuta,
} = require('../src/middlewares/auth');

// Simular opciones del supervisor (solo admin personal)
const opcionesSupervisor = [
  { id: 2, nombre: 'Gestión de Usuarios', ruta: '/usuarios/listar', idPadre: 4, orden: 1 },
  { id: 3, nombre: 'Gestión de Perfiles', ruta: '/perfiles/listar', idPadre: 4, orden: 2 },
  { id: 4, nombre: 'Administración del Personal', ruta: '#Admin', idPadre: null, orden: 2 },
];

const rutas = buildPermisosRutas(opcionesSupervisor);
console.log('Prefijos supervisor:', rutas);
console.log('/usuarios OK:', tieneAccesoRuta('/usuarios', rutas));
console.log('/usuarios/crear OK:', tieneAccesoRuta('/usuarios/crear', rutas));
console.log('/clientes DENEGADO:', !tieneAccesoRuta('/clientes', rutas));
console.log('/productos DENEGADO:', !tieneAccesoRuta('/productos', rutas));
console.log('/dashboard libre:', tieneAccesoRuta('/dashboard', rutas));
console.log('reportes normalizado:', normalizarRuta('/reportes/listar\n'));
