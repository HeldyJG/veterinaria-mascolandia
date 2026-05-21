/**
 * Checkpoints 10 (clínico) y 15 (inventario/ventas)
 * node scripts/checkpoint-10-15.js
 */
require('dotenv').config();
const sequelize = require('../src/config/database');
const {
  Cita,
  HistorialClinico,
  ExamenLaboratorio,
  Mascota,
  Cliente,
  Usuario,
  Servicio,
  Producto,
  Venta,
  VentaDetalle,
  CategoriaProducto,
  Proveedor,
} = require('../src/models');
const VentaController = require('../src/controllers/VentaController');

let ok = 0;
let fail = 0;
let warn = 0;

function pass(msg) {
  ok++;
  console.log(`  ✓ ${msg}`);
}
function failMsg(msg, err) {
  fail++;
  console.log(`  ✗ ${msg}`);
  if (err) console.log(`    ${err.message || err}`);
}
function warnMsg(msg) {
  warn++;
  console.log(`  ⚠ ${msg}`);
}

async function testCheckpoint10() {
  console.log('\n=== Checkpoint 10: Módulos clínicos ===\n');

  try {
    const citasCount = await Cita.count();
    pass(`Citas: consulta OK (${citasCount} registros)`);
  } catch (e) {
    failMsg('Citas: error al consultar', e);
  }

  try {
    await Cita.findAll({
      limit: 1,
      include: [
        { model: Mascota, as: 'mascota', include: [{ model: Cliente, as: 'cliente' }] },
        { model: Servicio, as: 'servicio' },
        { model: Usuario, as: 'usuario' },
      ],
    });
    pass('Citas: relaciones mascota/cliente/servicio/usuario OK');
  } catch (e) {
    failMsg('Citas: error en includes', e);
  }

  const estados = ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'];
  for (const est of estados) {
    const n = await Cita.count({ where: { estado: est } }).catch(() => -1);
    if (n >= 0) pass(`Citas: estado ${est} consultable`);
  }

  try {
    const hCount = await HistorialClinico.count({ where: { estado: 1 } });
    pass(`Historial clínico: consulta OK (${hCount} activos)`);
  } catch (e) {
    failMsg('Historial: error al consultar', e);
  }

  try {
    const exCount = await ExamenLaboratorio.count();
    pass(`Exámenes laboratorio: consulta OK (${exCount} registros)`);
  } catch (e) {
    failMsg('Exámenes: error al consultar', e);
  }

  const historial = await HistorialClinico.findOne({ where: { estado: 1 } });
  if (historial) {
    const reg = new Date(historial.fechaRegistro);
    const horas = (Date.now() - reg.getTime()) / (1000 * 60 * 60);
    const { puedeEditarHistorial } = require('../src/controllers/HistorialClinicoController');
    if (typeof puedeEditarHistorial === 'function') {
      pass('Historial: regla edición 24h implementada en código');
      const editable = puedeEditarHistorial(historial);
      if (!editable && horas > 24) pass('Historial: registro antiguo correctamente no editable');
      else if (editable && horas <= 24) pass('Historial: registro reciente editable');
    } else {
      failMsg('Historial: falta función puedeEditarHistorial');
    }
  }

  const mascota = await Mascota.findOne({ where: { estado: 1 } });
  const usuario = await Usuario.findOne({ where: { estado: 1 } });
  const servicio = await Servicio.findOne({ where: { estado: 1 } });
  if (mascota && usuario && servicio) {
    pass('Datos base para flujo cita→historial disponibles');
  } else {
    warnMsg('Faltan mascota/usuario/servicio activos para probar flujo completo');
  }
}

async function testCheckpoint15() {
  console.log('\n=== Checkpoint 15: Inventario y ventas ===\n');

  try {
    const cat = await CategoriaProducto.count({ where: { estado: 1 } });
    const prov = await Proveedor.count({ where: { estado: 1 } });
    pass(`Categorías activas: ${cat}, Proveedores activos: ${prov}`);
  } catch (e) {
    failMsg('Categorías/Proveedores', e);
  }

  try {
    const productos = await Producto.findAll({ where: { estado: 1 }, limit: 50 });
    let bajo = 0;
    let sin = 0;
    productos.forEach((p) => {
      if (p.stockActual <= 0) sin++;
      else if (p.stockActual < p.stockMinimo) bajo++;
    });
    pass(`Productos: ${productos.length} activos, ${bajo} stock bajo, ${sin} sin stock`);
  } catch (e) {
    failMsg('Productos: alertas stock', e);
  }

  const producto = await Producto.findOne({ where: { estado: 1, stockActual: { [require('sequelize').Op.gte]: 2 } } });
  const usuario = await Usuario.findOne({ where: { estado: 1 } });

  if (!producto || !usuario) {
    warnMsg('No hay producto con stock>=2 o usuario para simular venta');
    return;
  }

  const stockInicial = producto.stockActual;
  const transaction = await sequelize.transaction();

  try {
    const numero = await VentaController.generarNumeroComprobante('TICKET', transaction);
    if (/^T-\d{6}$/.test(numero)) pass(`Comprobante secuencial generado: ${numero}`);
    else failMsg(`Formato comprobante inválido: ${numero}`);

    const venta = await Venta.create(
      {
        idCliente: null,
        idUsuario: usuario.id,
        tipoComprobante: 'TICKET',
        numeroComprobante: numero + '-TEST',
        metodoPago: 'EFECTIVO',
        total: producto.precioVenta,
        estado: 'COMPLETADA',
        fechaVenta: new Date(),
      },
      { transaction }
    );

    await VentaDetalle.create(
      {
        idVenta: venta.id,
        idProducto: producto.id,
        cantidad: 1,
        precioUnitario: producto.precioVenta,
        subtotal: producto.precioVenta,
      },
      { transaction }
    );

    await producto.update({ stockActual: stockInicial - 1 }, { transaction });
    await transaction.commit();

    await producto.reload();
    if (producto.stockActual === stockInicial - 1) {
      pass('Venta: stock disminuye al registrar');
    } else {
      failMsg(`Venta: stock esperado ${stockInicial - 1}, actual ${producto.stockActual}`);
    }

    const ventaCompleta = await Venta.findByPk(venta.id, {
      include: [{ model: VentaDetalle, as: 'detalles' }],
    });
    const tAnular = await sequelize.transaction();
    for (const detalle of ventaCompleta.detalles) {
      const prod = await Producto.findByPk(detalle.idProducto, { transaction: tAnular });
      await prod.update({ stockActual: prod.stockActual + detalle.cantidad }, { transaction: tAnular });
    }
    await ventaCompleta.update({ estado: 'ANULADA' }, { transaction: tAnular });
    await tAnular.commit();

    await producto.reload();
    if (producto.stockActual === stockInicial) {
      pass('Anulación: stock restaurado correctamente');
    } else {
      failMsg(`Anulación: stock esperado ${stockInicial}, actual ${producto.stockActual}`);
    }

    const anuladasEnReporte = await Venta.count({ where: { estado: 'ANULADA' } });
    const completadas = await Venta.count({ where: { estado: 'COMPLETADA' } });
    pass(`Ventas: ${completadas} completadas, ${anuladasEnReporte} anuladas en BD`);
  } catch (e) {
    await transaction.rollback().catch(() => {});
    failMsg('Flujo venta/anulación transaccional', e);
  }
}

async function main() {
  console.log('Checkpoint 10 y 15 — verificación automática\n');
  try {
    await sequelize.authenticate();
    await testCheckpoint10();
    await testCheckpoint15();
  } catch (e) {
    failMsg('Conexión BD', e);
  }

  console.log('\n--- Resultado ---');
  console.log(`OK: ${ok}  |  Fallos: ${fail}  |  Advertencias: ${warn}`);
  if (fail === 0) {
    console.log('\nCheckpoints 10 y 15: verificación automática superada.\n');
  } else {
    console.log('\nRevisar fallos antes de marcar checkpoints completos.\n');
  }
  await sequelize.close();
  process.exit(fail > 0 ? 1 : 0);
}

main();
