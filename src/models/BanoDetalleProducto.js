const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Bano = require('./Bano');
const Producto = require('./Producto');

const BanoDetalleProducto = sequelize.define('BanoDetalleProducto', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idBano: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_baño',
  },
  idProducto: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_producto',
  },
  cantidadMl: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'cantidad_ml',
  },
}, {
  tableName: 'baños_detalle_productos',
  timestamps: false,
});

BanoDetalleProducto.belongsTo(Bano, { foreignKey: 'idBano', as: 'bano' });
Bano.hasMany(BanoDetalleProducto, { foreignKey: 'idBano', as: 'detalles_productos' });

BanoDetalleProducto.belongsTo(Producto, { foreignKey: 'idProducto', as: 'producto' });
Producto.hasMany(BanoDetalleProducto, { foreignKey: 'idProducto', as: 'detalles_banos' });

module.exports = BanoDetalleProducto;
