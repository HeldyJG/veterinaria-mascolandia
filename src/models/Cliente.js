const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  dni: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true,
  },
  nombreCompleto: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'nombre_completo',
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: true,
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
  tableName: 'clientes',
  timestamps: false,
});

module.exports = Cliente;
