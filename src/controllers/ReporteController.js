const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Venta,
  VentaDetalle,
  Cita,
  Bano,
  Servicio,
  HistorialClinico,
  Producto,
  BanoStock,
  Cliente,
  Mascota,
  Usuario,
  CategoriaProducto,
  Proveedor,
} = require('../models');
const { parseRangoFechas, pctCambio, diasEntre, generarCsv } = require('../utils/reporteHelpers');

const ESTADO_VENTA_OK = 'COMPLETADA';

class ReporteController {
  static async mostrarPagina(req, res) {
    try {
      res.render('reportes', {
        title: 'Panel de Reportes Ejecutivos | Mascolandia',
        pageTitle: 'Reportes y Analíticas de Negocio',
        activePage: '/reportes/listar',
      });
    } catch (error) {
      console.error('Error al cargar la página de reportes:', error);
      req.flash('error', 'Error al cargar la página de reportes.');
      res.redirect('/dashboard');
    }
  }

  static async datosVentas(rango) {
    const { inicioDate, finDate, inicioAntDate, finAntDate } = rango;

    const ventas = await Venta.findAll({
      where: {
        fechaVenta: { [Op.between]: [inicioDate, finDate] },
        estado: ESTADO_VENTA_OK,
      },
      include: [{ model: Cliente, as: 'cliente' }],
    });

    const ventasAnt = await Venta.findAll({
      where: {
        fechaVenta: { [Op.between]: [inicioAntDate, finAntDate] },
        estado: ESTADO_VENTA_OK,
      },
    });

    const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const totalAnt = ventasAnt.reduce((s, v) => s + parseFloat(v.total || 0), 0);

    const porMetodoPago = {};
    ventas.forEach((v) => {
      const mp = v.metodoPago || 'OTRO';
      if (!porMetodoPago[mp]) porMetodoPago[mp] = { metodo: mp, cantidad: 0, monto: 0 };
      porMetodoPago[mp].cantidad += 1;
      porMetodoPago[mp].monto += parseFloat(v.total || 0);
    });

    const ventaIds = ventas.map((v) => v.id);
    let topProductos = [];
    if (ventaIds.length > 0) {
      const detalles = await VentaDetalle.findAll({
        where: { idVenta: { [Op.in]: ventaIds } },
        include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }],
      });
      const mapProd = {};
      detalles.forEach((d) => {
        const nombre = d.producto ? d.producto.nombre : `Producto #${d.idProducto}`;
        if (!mapProd[nombre]) mapProd[nombre] = { nombre, cantidad: 0, monto: 0 };
        mapProd[nombre].cantidad += parseInt(d.cantidad, 10);
        mapProd[nombre].monto += parseFloat(d.subtotal || 0);
      });
      topProductos = Object.values(mapProd)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)
        .map((p) => ({ ...p, monto: parseFloat(p.monto.toFixed(2)) }));
    }

    const tendencia = diasEntre(inicioDate, finDate).map((diaStr) => {
      const diaIni = new Date(`${diaStr}T00:00:00`);
      const diaFin = new Date(`${diaStr}T23:59:59`);
      const monto = ventas
        .filter((v) => {
          const f = new Date(v.fechaVenta);
          return f >= diaIni && f <= diaFin;
        })
        .reduce((s, v) => s + parseFloat(v.total || 0), 0);
      return {
        label: diaStr.split('-').slice(1).reverse().join('/'),
        valor: parseFloat(monto.toFixed(2)),
      };
    });

    return {
      totalVentas: parseFloat(totalVentas.toFixed(2)),
      cantidadVentas: ventas.length,
      comparacionAnterior: pctCambio(totalVentas, totalAnt),
      porMetodoPago: Object.values(porMetodoPago).map((m) => ({
        ...m,
        monto: parseFloat(m.monto.toFixed(2)),
      })),
      topProductos,
      tendencia,
    };
  }

  static async datosServicios(rango) {
    const { fechaInicio, fechaFin, inicioDate, finDate, fechaInicioAnt, fechaFinAnt } = rango;

    const citas = await Cita.findAll({
      where: { fecha: { [Op.between]: [fechaInicio, fechaFin] } },
      include: [
        { model: Servicio, as: 'servicio' },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: Mascota, as: 'mascota' },
      ],
    });

    const citasAtendidas = citas.filter((c) => c.estado === 'ATENDIDA');
    const banos = await Bano.findAll({
      where: { fecha: { [Op.between]: [fechaInicio, fechaFin] } },
    });
    const consultas = await HistorialClinico.count({
      where: { fechaRegistro: { [Op.between]: [inicioDate, finDate] } },
    });

    const porEstado = {};
    citas.forEach((c) => {
      const est = c.estado || 'SIN_ESTADO';
      porEstado[est] = (porEstado[est] || 0) + 1;
    });

    const porServicio = {};
    citasAtendidas.forEach((c) => {
      const nombre = c.servicio ? c.servicio.nombre : 'Sin servicio';
      if (!porServicio[nombre]) {
        porServicio[nombre] = { nombre, citas: 0, ingresos: 0 };
      }
      porServicio[nombre].citas += 1;
      porServicio[nombre].ingresos += parseFloat(c.servicio ? c.servicio.precio : 0);
    });
    banos.forEach((b) => {
      const nombre = b.tipoServicio || 'Baño / Estética';
      if (!porServicio[nombre]) porServicio[nombre] = { nombre, citas: 0, ingresos: 0 };
      porServicio[nombre].citas += 1;
      porServicio[nombre].ingresos += parseFloat(b.precio || 0);
    });

    const topVeterinarios = {};
    citasAtendidas.forEach((c) => {
      if (!c.usuario) return;
      const id = c.usuario.id;
      if (!topVeterinarios[id]) {
        topVeterinarios[id] = { nombre: c.usuario.nombre, citas: 0 };
      }
      topVeterinarios[id].citas += 1;
    });

    return {
      totalCitas: citas.length,
      citasAtendidas: citasAtendidas.length,
      totalBanos: banos.length,
      consultasHistorial: consultas,
      porEstado: Object.entries(porEstado).map(([estado, cantidad]) => ({ estado, cantidad })),
      ingresosPorServicio: Object.values(porServicio)
        .map((s) => ({ ...s, ingresos: parseFloat(s.ingresos.toFixed(2)) }))
        .sort((a, b) => b.ingresos - a.ingresos),
      topVeterinarios: Object.values(topVeterinarios)
        .sort((a, b) => b.citas - a.citas)
        .slice(0, 10),
      periodoAnterior: {
        citas: await Cita.count({
          where: {
            estado: 'ATENDIDA',
            fecha: { [Op.between]: [fechaInicioAnt, fechaFinAnt] },
          },
        }),
      },
    };
  }

  static async datosClientes(rango) {
    const { inicioDate, finDate, inicioAntDate, finAntDate, fechaInicio, fechaFin } = rango;

    const ventas = await Venta.findAll({
      where: {
        fechaVenta: { [Op.between]: [inicioDate, finDate] },
        estado: ESTADO_VENTA_OK,
        idCliente: { [Op.ne]: null },
      },
      include: [{ model: Cliente, as: 'cliente' }],
    });

    const citas = await Cita.findAll({
      where: { estado: 'ATENDIDA', fecha: { [Op.between]: [fechaInicio, fechaFin] } },
      include: [{ model: Mascota, as: 'mascota', include: [{ model: Cliente, as: 'cliente' }] }],
    });

    const banos = await Bano.findAll({
      where: { fecha: { [Op.between]: [fechaInicio, fechaFin] } },
      include: [{ model: Mascota, as: 'mascota', include: [{ model: Cliente, as: 'cliente' }] }],
    });

    const mapa = {};
    const registrar = (cliente, monto, visita = 1) => {
      if (!cliente) return;
      const id = cliente.id;
      if (!mapa[id]) {
        mapa[id] = {
          id,
          nombre: cliente.nombreCompleto,
          citas: 0,
          gasto: 0,
        };
      }
      mapa[id].gasto += monto;
      mapa[id].citas += visita;
    };

    ventas.forEach((v) => registrar(v.cliente, parseFloat(v.total || 0)));
    citas.forEach((c) => {
      if (c.mascota && c.mascota.cliente) {
        registrar(c.mascota.cliente, parseFloat(c.servicio ? c.servicio.precio : 0));
      }
    });
    banos.forEach((b) => {
      if (b.mascota && b.mascota.cliente) {
        registrar(b.mascota.cliente, parseFloat(b.precio || 0));
      }
    });

    const clientes = Object.values(mapa);
    const topPorCitas = [...clientes].sort((a, b) => b.citas - a.citas).slice(0, 20);
    const topPorGasto = [...clientes]
      .map((c) => ({ ...c, gasto: parseFloat(c.gasto.toFixed(2)) }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 20);

    const nuevosClientes = await Cliente.count({
      where: { fechaRegistro: { [Op.between]: [inicioDate, finDate] }, estado: 1 },
    });

    const clientesPeriodoAnt = new Set();
    const ventasAnt = await Venta.findAll({
      where: {
        fechaVenta: { [Op.between]: [inicioAntDate, finAntDate] },
        estado: ESTADO_VENTA_OK,
        idCliente: { [Op.ne]: null },
      },
    });
    ventasAnt.forEach((v) => clientesPeriodoAnt.add(String(v.idCliente)));

    const clientesActualesIds = new Set(clientes.map((c) => String(c.id)));
    let retenidos = 0;
    clientesPeriodoAnt.forEach((id) => {
      if (clientesActualesIds.has(id)) retenidos += 1;
    });
    const tasaRetencion =
      clientesPeriodoAnt.size > 0
        ? Math.round((retenidos * 100) / clientesPeriodoAnt.size)
        : 0;

    return {
      clientesAtendidos: clientes.length,
      nuevosClientes,
      tasaRetencion,
      topPorCitas,
      topPorGasto,
    };
  }

  static async datosInventario() {
    const productos = await Producto.findAll({
      where: { estado: 1 },
      include: [
        { model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombreEmpresa'] },
      ],
      order: [['nombre', 'ASC']],
    });

    const sinStock = [];
    const stockBajo = [];
    const ok = [];
    let valorInventario = 0;

    productos.forEach((p) => {
      const stock = parseInt(p.stockActual, 10);
      const min = parseInt(p.stockMinimo, 10);
      const precio = parseFloat(p.precioCompra || 0);
      valorInventario += stock * precio;

      const item = {
        id: p.id,
        nombre: p.nombre,
        stockActual: stock,
        stockMinimo: min,
        categoria: p.categoria ? p.categoria.nombre : '—',
        proveedor: p.proveedor ? p.proveedor.nombreEmpresa : '—',
        valor: parseFloat((stock * precio).toFixed(2)),
      };

      if (stock <= 0) sinStock.push(item);
      else if (stock < min) stockBajo.push(item);
      else ok.push(item);
    });

    const porCategoria = {};
    const porProveedor = {};
    productos.forEach((p) => {
      const cat = p.categoria ? p.categoria.nombre : 'Sin categoría';
      const prov = p.proveedor ? p.proveedor.nombreEmpresa : 'Sin proveedor';
      porCategoria[cat] = (porCategoria[cat] || 0) + 1;
      porProveedor[prov] = (porProveedor[prov] || 0) + 1;
    });

    const alertas = [...sinStock, ...stockBajo].slice(0, 10).map((p) => ({
      nombre: p.nombre,
      actual: p.stockActual,
      maximo: Math.max(p.stockMinimo * 2, 1),
      porcentaje: Math.min(
        100,
        Math.round((p.stockActual * 100) / Math.max(p.stockMinimo * 2, 1))
      ),
    }));

    const bStock = await BanoStock.findByPk(1);
    if (bStock) {
      const shActual = parseFloat(bStock.shampooActual || 0);
      const shMax = parseFloat(bStock.shampooMax || 1);
      if (shActual < shMax * 0.3) {
        alertas.push({
          nombre: 'Shampoo de Baño',
          actual: Math.round(shActual),
          maximo: Math.round(shMax),
          porcentaje: Math.round((shActual * 100) / shMax),
        });
      }
    }

    return {
      valorInventario: parseFloat(valorInventario.toFixed(2)),
      totalProductos: productos.length,
      sinStock,
      stockBajo,
      stockOk: ok.length,
      porCategoria: Object.entries(porCategoria).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
      })),
      porProveedor: Object.entries(porProveedor).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
      })),
      alertas,
    };
  }

  static async obtenerReporteCompleto(req, res) {
    try {
      const rango = parseRangoFechas(req.query);
      const [ventas, servicios, clientes, inventario] = await Promise.all([
        ReporteController.datosVentas(rango),
        ReporteController.datosServicios(rango),
        ReporteController.datosClientes(rango),
        ReporteController.datosInventario(),
      ]);

      const ingresosVentas = ventas.totalVentas;
      const ingresosServicios = servicios.ingresosPorServicio.reduce(
        (s, x) => s + x.ingresos,
        0
      );
      const totalIngresos = ingresosVentas + ingresosServicios;

      const totalServicios =
        servicios.citasAtendidas + servicios.totalBanos + servicios.consultasHistorial;

      const ticketPromedio =
        ventas.cantidadVentas + totalServicios > 0
          ? totalIngresos / (ventas.cantidadVentas + totalServicios)
          : 0;

      const distribucionServicios = {
        Consultas: servicios.consultasHistorial + servicios.citasAtendidas,
        Baños: servicios.totalBanos,
        Citas: servicios.totalCitas,
      };

      const serviciosMasSolicitados = servicios.ingresosPorServicio
        .map((s) => ({
          nombre: s.nombre,
          cantidad: s.citas,
          porcentaje:
            totalServicios > 0 ? Math.round((s.citas * 100) / totalServicios) : 0,
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8);

      const totalClientesActivos = await Cliente.count({ where: { estado: 1 } });
      const totalMascotasActivas = await Mascota.count({ where: { estado: 1 } });
      const citasPendientesCount = await Cita.count({ where: { estado: 'PENDIENTE' } });

      const ultVentas = await Venta.findAll({
        where: { estado: ESTADO_VENTA_OK },
        limit: 8,
        order: [['fechaVenta', 'DESC']],
        include: [{ model: Cliente, as: 'cliente' }],
      });
      const ultimasTransacciones = ultVentas.map((v) => ({
        mascota: v.cliente ? v.cliente.nombreCompleto : 'Cliente general',
        tipo: 'Venta',
        detalle: v.numeroComprobante || v.tipoComprobante,
        fecha: new Date(v.fechaVenta).toLocaleDateString('es-PE'),
        monto: parseFloat(v.total || 0),
      }));

      res.json({
        success: true,
        periodo: { inicio: rango.fechaInicio, fin: rango.fechaFin },
        kpis: {
          ingresosPeriodo: parseFloat(totalIngresos.toFixed(2)),
          comparacionPeriodoAnterior: ventas.comparacionAnterior,
          serviciosRealizados: totalServicios,
          serviciosDiferencia: totalServicios - servicios.periodoAnterior.citas,
          clientesAtendidos: clientes.clientesAtendidos,
          porcentajeNuevosClientes: clientes.clientesAtendidos
            ? `+${Math.round((clientes.nuevosClientes * 100) / clientes.clientesAtendidos)}%`
            : '0%',
          ticketPromedio: parseFloat(ticketPromedio.toFixed(2)),
          ticketPromedioComparacion: ventas.comparacionAnterior,
        },
        graficos: {
          ingresosPorDia: ventas.tendencia,
          distribucionServicios,
          ventasPorMetodo: ventas.porMetodoPago,
          citasPorEstado: servicios.porEstado,
        },
        ventas,
        servicios,
        clientes,
        inventario,
        serviciosMasSolicitados,
        alertasInventario: inventario.alertas,
        ultimasTransacciones,
        mejoresClientes: clientes.topPorGasto.slice(0, 5).map((c) => ({
          nombre: c.nombre,
          visitas: c.citas,
          total: c.gasto,
        })),
        estadisticasGenerales: {
          totalClientes: totalClientesActivos,
          totalMascotas: totalMascotasActivas,
          citasPendientes: citasPendientesCount,
        },
      });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async exportar(req, res) {
    try {
      const tipo = req.query.tipo || 'completo';
      const rango = parseRangoFechas(req.query);
      const nombreArchivo = `reporte-${tipo}-${rango.fechaInicio}_${rango.fechaFin}.csv`;

      let csv = '';
      if (tipo === 'ventas') {
        const d = await ReporteController.datosVentas(rango);
        csv = generarCsv(d.topProductos, [
          { key: 'nombre', label: 'Producto' },
          { key: 'cantidad', label: 'Cantidad vendida' },
          { key: 'monto', label: 'Monto S/.' },
        ]);
        csv =
          `Total ventas,${d.totalVentas}\nCantidad transacciones,${d.cantidadVentas}\n\n` +
          csv;
      } else if (tipo === 'servicios') {
        const d = await ReporteController.datosServicios(rango);
        csv = generarCsv(d.ingresosPorServicio, [
          { key: 'nombre', label: 'Servicio' },
          { key: 'citas', label: 'Atenciones' },
          { key: 'ingresos', label: 'Ingresos S/.' },
        ]);
      } else if (tipo === 'clientes') {
        const d = await ReporteController.datosClientes(rango);
        csv = generarCsv(d.topPorGasto, [
          { key: 'nombre', label: 'Cliente' },
          { key: 'citas', label: 'Visitas' },
          { key: 'gasto', label: 'Gasto S/.' },
        ]);
      } else if (tipo === 'inventario') {
        const d = await ReporteController.datosInventario();
        const filas = [...d.sinStock, ...d.stockBajo];
        csv = generarCsv(filas, [
          { key: 'nombre', label: 'Producto' },
          { key: 'stockActual', label: 'Stock' },
          { key: 'stockMinimo', label: 'Mínimo' },
          { key: 'categoria', label: 'Categoría' },
          { key: 'proveedor', label: 'Proveedor' },
        ]);
        csv = `Valor inventario,${d.valorInventario}\n\n` + csv;
      } else {
        const [v, s, c, i] = await Promise.all([
          ReporteController.datosVentas(rango),
          ReporteController.datosServicios(rango),
          ReporteController.datosClientes(rango),
          ReporteController.datosInventario(),
        ]);
        csv = [
          'RESUMEN REPORTE MASCOLANDIA',
          `Periodo,${rango.fechaInicio} a ${rango.fechaFin}`,
          `Ingresos ventas,${v.totalVentas}`,
          `Servicios realizados,${s.citasAtendidas + s.totalBanos}`,
          `Clientes atendidos,${c.clientesAtendidos}`,
          `Valor inventario,${i.valorInventario}`,
        ].join('\n');
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error al exportar:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ReporteController;
