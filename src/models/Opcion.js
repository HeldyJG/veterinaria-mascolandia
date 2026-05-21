const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Opcion = sequelize.define('Opcion', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  ruta: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  icono: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  idPadre: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'id_padre',
  },
  orden: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'opciones',
  timestamps: false,
});

module.exports = Opcion;
