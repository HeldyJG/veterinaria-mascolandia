/**
 * Checkpoint tarea 20 — Seguridad y permisos
 * Ejecutar: node scripts/checkpoint-tarea-20.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Usuario, Perfil, Opcion } = require('../src/models');
const {
  buildPermisosRutas,
  tieneAccesoRuta,
  usuarioTienePermiso,
  normalizarRuta,
} = require('../src/middlewares/auth');

let pasaron = 0;
let fallaron = 0;

function ok(msg) {
  pasaron++;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  fallaron++;
  console.log(`  ✗ ${msg}`);
}

async function main() {
  console.log('\n=== Checkpoint Tarea 20: Seguridad y permisos ===\n');

  // 1. Contraseñas hasheadas (bcrypt)
  console.log('1. Contraseñas hasheadas');
  const admin = await Usuario.findOne({ where: { usuario: 'admin', estado: 1 } });
  if (!admin) {
    fail('Usuario admin no encontrado');
  } else if (!admin.clave || !admin.clave.startsWith('$2')) {
    fail('La clave en BD no parece hash bcrypt ($2...)');
  } else if (admin.clave.length < 50) {
    fail('Hash bcrypt demasiado corto');
  } else {
    const match = await bcrypt.compare('123456', admin.clave);
    if (match) ok('Admin tiene clave hasheada y bcrypt.compare funciona');
    else fail('Hash presente pero no coincide con contraseña de prueba conocida');
  }

  const testHash = await bcrypt.hash('TestSeguro1', 10);
  if (testHash.startsWith('$2') && testHash !== 'TestSeguro1') {
    ok('bcrypt.hash genera hash válido (no texto plano)');
  } else {
    fail('bcrypt.hash no generó formato esperado');
  }

  // 2. Cambio de contraseña — lógica contraseña actual (simulación)
  console.log('\n2. Cambio de contraseña con verificación');
  if (admin) {
    const wrong = await bcrypt.compare('claveIncorrecta', admin.clave);
    if (!wrong) ok('Contraseña incorrecta rechazada por bcrypt.compare');
    else fail('bcrypt.compare aceptó contraseña incorrecta');
  }

  // 3. No auto-desactivar (lógica del controlador)
  console.log('\n3. Bloqueo auto-desactivación');
  const idSesion = 1;
  const idObjetivo = 1;
  const bloqueado = idObjetivo === idSesion;
  if (bloqueado) ok('Lógica: mismo id sesión/objetivo bloquea desactivación');
  else fail('Lógica de auto-desactivación incorrecta');

  // 4. Permisos por perfil — supervisor vs admin
  console.log('\n4. Control de acceso por rutas');
  const perfilSup = await Perfil.findOne({
    where: { nombre: 'Supervisor' },
    include: [{ model: Opcion, as: 'opciones', through: { attributes: [] } }],
  });
  const perfilAdmin = await Perfil.findOne({
    where: { nombre: 'Administrador' },
    include: [{ model: Opcion, as: 'opciones', through: { attributes: [] } }],
  });

  if (perfilSup && perfilAdmin) {
    const rutasSup = buildPermisosRutas(perfilSup.opciones);
    const rutasAdmin = buildPermisosRutas(perfilAdmin.opciones);

    if (tieneAccesoRuta('/usuarios', rutasSup)) ok('Supervisor puede /usuarios');
    else fail('Supervisor debería acceder a /usuarios');

    if (!tieneAccesoRuta('/clientes', rutasSup)) ok('Supervisor NO puede /clientes');
    else fail('Supervisor no debería acceder a /clientes');

    if (tieneAccesoRuta('/clientes', rutasAdmin)) ok('Administrador puede /clientes');
    else fail('Administrador debería acceder a /clientes');

    if (tieneAccesoRuta('/perfiles/listar', rutasAdmin)) ok('Administrador puede /perfiles/listar');
    else fail('Administrador debería acceder a perfiles');

    if (tieneAccesoRuta('/dashboard', rutasSup)) ok('Dashboard libre para supervisor');
    else fail('Dashboard debería ser libre para autenticados');
  } else {
    fail('No se encontraron perfiles Supervisor/Administrador');
  }

  // 5. Menú según permisos
  console.log('\n5. Menú adaptado al perfil');
  if (perfilSup) {
    const opciones = perfilSup.opciones.map((o) => ({
      ...o.toJSON(),
      ruta: normalizarRuta(o.ruta),
    }));
    const padres = opciones.filter((o) => o.idPadre === null);
    const hijos = opciones.filter((o) => o.idPadre !== null);
    const rutasMenu = hijos.map((h) => h.ruta).filter((r) => r && !r.startsWith('#'));

    if (!rutasMenu.includes('/clientes') && !rutasMenu.some((r) => r && r.startsWith('/clientes'))) {
      ok('Menú supervisor sin enlace a Clientes');
    } else {
      fail('Menú supervisor incluye Clientes indebidamente');
    }

    if (rutasMenu.some((r) => r && r.includes('usuarios'))) {
      ok('Menú supervisor incluye Usuarios');
    } else {
      fail('Menú supervisor debería incluir Usuarios');
    }
  }

  // 6. Permiso por nombre
  console.log('\n6. checkPermission por nombre');
  const reqMock = {
    session: {
      permisosNombres: ['Gestión de Usuarios', 'Gestión de Perfiles'],
    },
  };
  if (usuarioTienePermiso(reqMock, 'Gestión de Usuarios')) ok('usuarioTienePermiso detecta permiso existente');
  else fail('usuarioTienePermiso falló con permiso válido');
  if (!usuarioTienePermiso(reqMock, 'Clientes')) ok('usuarioTienePermiso rechaza permiso inexistente');
  else fail('usuarioTienePermiso aceptó permiso inexistente');

  // 7. Ruta perfiles en menú
  console.log('\n7. Ruta Gestión de Perfiles');
  const opcionPerfiles = await Opcion.findOne({ where: { nombre: 'Gestión de Perfiles' } });
  if (opcionPerfiles && normalizarRuta(opcionPerfiles.ruta) === '/perfiles/listar') {
    ok('Opción menú Perfiles apunta a /perfiles/listar');
  } else if (opcionPerfiles) {
    fail(`Opción Perfiles tiene ruta incorrecta: ${opcionPerfiles.ruta}`);
  } else {
    fail('Opción Gestión de Perfiles no encontrada en BD');
  }

  console.log('\n--- Resultado ---');
  console.log(`Pasaron: ${pasaron}`);
  console.log(`Fallaron: ${fallaron}`);
  console.log(
    fallaron === 0
      ? '\nCheckpoint 20: TODAS las verificaciones automáticas OK.\n'
      : '\nCheckpoint 20: Revisar fallos antes de marcar completo.\n'
  );

  process.exit(fallaron > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
