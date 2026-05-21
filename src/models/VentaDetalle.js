const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Venta = require('./Venta');
const Producto = require('./Producto');

const VentaDetalle = sequelize.define('VentaDetalle', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idVenta: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_venta',
  },
  idProducto: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_producto',
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'precio_unitario',
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'ventas_detalle',
  timestamps: false,
});

VentaDetalle.belongsTo(Venta, { foreignKey: 'idVenta', as: 'venta' });
Venta.hasMany(VentaDetalle, { foreignKey: 'idVenta', as: 'detalles' });

VentaDetalle.belongsTo(Producto, { foreignKey: 'idProducto', as: 'producto' });
Producto.hasMany(VentaDetalle, { foreignKey: 'idProducto', as: 'detalles_ventas' });

module.exports = VentaDetalle;
