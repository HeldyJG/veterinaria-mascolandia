const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BanoStock = sequelize.define('BanoStock', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  acondicionadorActual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'acondicionador_actual',
  },
  acondicionadorMax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'acondicionador_max',
  },
  shampooActual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'shampoo_actual',
  },
  shampooMax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'shampoo_max',
  },
}, {
  tableName: 'baño_stock',
  timestamps: false,
});

module.exports = BanoStock;
