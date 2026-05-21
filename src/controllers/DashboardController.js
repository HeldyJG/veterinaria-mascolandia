const { Op, fn, col, literal } = require('sequelize');
const { Cliente, Mascota, Cita, Servicio, Venta, Producto, Bano } = require('../models');

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ESTADOS_PENDIENTES = ['PENDIENTE', 'CONFIRMADA', 'EN_ESPERA'];

function inicioDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1, 0, 0, 0, 0);
}

function finDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999);
}

function sumarMontos(registros, campo) {
  return registros.reduce((sum, r) => sum + parseFloat(r[campo] || 0), 0);
}

class DashboardController {
  static async index(req, res) {
    try {
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0];
      const inicioMes = inicioDelMes(hoy);
      const finMes = finDelMes(hoy);

      const enSieteDias = new Date(hoy);
      enSieteDias.setDate(enSieteDias.getDate() + 7);
      const finSieteStr = enSieteDias.toISOString().split('T')[0];

      const [
        totalClientes,
        totalMascotas,
        totalCitasHoy,
        totalCitasMes,
        citasPendientesHoy,
        totalVentasMes,
        productosStockBajo,
        productosSinStock,
        ultimasVentas,
        proximasCitas,
        banosMesActual,
        citasAtendidasMes,
      ] = await Promise.all([
        Cliente.count({ where: { estado: 1 } }),
        Mascota.count({ where: { estado: 1 } }),
        Cita.count({ where: { fecha: hoyStr } }),
        Cita.count({
          where: {
            fecha: {
              [Op.between]: [
                inicioMes.toISOString().split('T')[0],
                finMes.toISOString().split('T')[0],
              ],
            },
          },
        }),
        Cita.count({
          where: {
            fecha: hoyStr,
            estado: { [Op.in]: ESTADOS_PENDIENTES },
          },
        }),
        Venta.sum('total', {
          where: {
            estado: 'COMPLETADA',
            fechaVenta: { [Op.between]: [inicioMes, finMes] },
          },
        }),
        Producto.count({
          where: {
            estado: 1,
            stockActual: { [Op.gt]: 0 },
            [Op.and]: literal('stock_actual <= stock_minimo'),
          },
        }),
        Producto.count({ where: { estado: 1, stockActual: 0 } }),
        Venta.findAll({
          where: { estado: 'COMPLETADA' },
          limit: 10,
          order: [['fechaVenta', 'DESC']],
          include: [{ model: Cliente, as: 'cliente', required: false }],
        }),
        Cita.findAll({
          where: {
            fecha: { [Op.between]: [hoyStr, finSieteStr] },
            estado: { [Op.in]: ESTADOS_PENDIENTES },
          },
          limit: 10,
          order: [
            ['fecha', 'ASC'],
            ['hora', 'ASC'],
          ],
          include: [
            {
              model: Mascota,
              as: 'mascota',
              include: [{ model: Cliente, as: 'cliente' }],
            },
            { model: Servicio, as: 'servicio' },
          ],
        }),
        Bano.findAll({
          attributes: ['precio'],
          where: {
            fecha: {
              [Op.between]: [
                inicioMes.toISOString().split('T')[0],
                finMes.toISOString().split('T')[0],
              ],
            },
          },
        }),
        Cita.findAll({
          where: {
            estado: 'ATENDIDA',
            fecha: {
              [Op.between]: [
                inicioMes.toISOString().split('T')[0],
                finMes.toISOString().split('T')[0],
              ],
            },
          },
          include: [{ model: Servicio, as: 'servicio' }],
        }),
      ]);

      const ingresosVentasMes = parseFloat(totalVentasMes || 0);
      const ingresosBanosMes = sumarMontos(banosMesActual, 'precio');
      const ingresosCitasMes = citasAtendidasMes.reduce(
        (sum, c) => sum + parseFloat(c.servicio ? c.servicio.precio : 0),
        0
      );
      const ingresosMesTotal = ingresosVentasMes + ingresosBanosMes + ingresosCitasMes;

      const ingresosMensuales = [];
      for (let i = 5; i >= 0; i--) {
        const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const inicio = inicioDelMes(ref);
        const fin = finDelMes(ref);
        const inicioStr = inicio.toISOString().split('T')[0];
        const finStr = fin.toISOString().split('T')[0];

        const [ventasMes, banosMes, citasMes] = await Promise.all([
          Venta.sum('total', {
            where: {
              estado: 'COMPLETADA',
              fechaVenta: { [Op.between]: [inicio, fin] },
            },
          }),
          Bano.sum('precio', {
            where: { fecha: { [Op.between]: [inicioStr, finStr] } },
          }),
          Cita.findAll({
            where: {
              estado: 'ATENDIDA',
              fecha: { [Op.between]: [inicioStr, finStr] },
            },
            include: [{ model: Servicio, as: 'servicio' }],
          }),
        ]);

        const ingresoCitas = citasMes.reduce(
          (sum, c) => sum + parseFloat(c.servicio ? c.servicio.precio : 0),
          0
        );

        ingresosMensuales.push({
          label: `${MESES_ES[ref.getMonth()]} ${ref.getFullYear()}`,
          ventas: parseFloat(ventasMes || 0),
          otros: parseFloat(banosMes || 0) + ingresoCitas,
          total: parseFloat(ventasMes || 0) + parseFloat(banosMes || 0) + ingresoCitas,
        });
      }

      const citasEstadoRows = await Cita.findAll({
        attributes: ['estado', [fn('COUNT', col('id')), 'cantidad']],
        where: {
          fecha: {
            [Op.between]: [
              inicioMes.toISOString().split('T')[0],
              finMes.toISOString().split('T')[0],
            ],
          },
        },
        group: ['estado'],
        raw: true,
      });

      const citasPorEstado = {
        labels: [],
        valores: [],
      };
      citasEstadoRows.forEach((row) => {
        if (row.estado) {
          citasPorEstado.labels.push(row.estado);
          citasPorEstado.valores.push(parseInt(row.cantidad, 10));
        }
      });

      const productosAlerta = await Producto.findAll({
        where: {
          estado: 1,
          [Op.or]: [
            { stockActual: 0 },
            literal('stock_actual <= stock_minimo'),
          ],
        },
        attributes: ['id', 'nombre', 'stockActual', 'stockMinimo'],
        order: [['stockActual', 'ASC']],
        limit: 8,
      });

      res.render('dashboard', {
        title: 'Dashboard | Mascolandia',
        pageTitle: 'Dashboard - Panel de Control',
        activePage: 'dashboard',
        stats: {
          totalClientes,
          totalMascotas,
          totalCitasHoy,
          totalCitasMes,
          citasPendientesHoy,
          ingresosMesTotal,
          ingresosVentasMes,
          productosStockBajo,
          productosSinStock,
        },
        ultimasVentas,
        proximasCitas,
        productosAlerta,
        chartIngresos: JSON.stringify(ingresosMensuales),
        chartCitasEstado: JSON.stringify(citasPorEstado),
      });
    } catch (error) {
      console.error('Error al cargar el Dashboard:', error);
      req.flash('error', 'Error al cargar los datos del panel.');
      res.redirect('/auth/login');
    }
  }
}

module.exports = DashboardController;
