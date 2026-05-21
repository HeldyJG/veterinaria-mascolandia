const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Especie = sequelize.define('Especie', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'especies',
  timestamps: false,
});

module.exports = Especie;
