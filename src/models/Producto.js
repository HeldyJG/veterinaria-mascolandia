const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CategoriaProducto = require('./CategoriaProducto');
const Proveedor = require('./Proveedor');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  codigoBarras: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    field: 'codigo_barras',
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  idCategoria: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'id_categoria',
  },
  idProveedor: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_proveedor',
  },
  precioCompra: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'precio_compra',
  },
  precioVenta: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'precio_venta',
  },
  stockActual: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'stock_actual',
  },
  stockMinimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    field: 'stock_minimo',
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'productos',
  timestamps: false,
});

Producto.belongsTo(CategoriaProducto, { foreignKey: 'idCategoria', as: 'categoria' });
CategoriaProducto.hasMany(Producto, { foreignKey: 'idCategoria', as: 'productos' });

Producto.belongsTo(Proveedor, { foreignKey: 'idProveedor', as: 'proveedor' });
Proveedor.hasMany(Producto, { foreignKey: 'idProveedor', as: 'productos' });

module.exports = Producto;
