const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Proveedor = sequelize.define('Proveedor', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  ruc: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  nombreEmpresa: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'nombre_empresa',
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'proveedores',
  timestamps: false,
});

module.exports = Proveedor;
