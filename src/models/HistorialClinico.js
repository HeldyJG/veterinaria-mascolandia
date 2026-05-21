const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cita = require('./Cita');
const Mascota = require('./Mascota');
const Usuario = require('./Usuario');

const HistorialClinico = sequelize.define('HistorialClinico', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  diagnostico: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
  motivoConsulta: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'motivo_consulta',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  peso: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  sintomas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  temperatura: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  tratamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  idCita: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'id_cita',
  },
  idMascota: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_mascota',
  },
  idUsuario: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_usuario',
  },
}, {
  tableName: 'historial_clinico',
  timestamps: false,
});

HistorialClinico.belongsTo(Cita, { foreignKey: 'idCita', as: 'cita' });
Cita.hasOne(HistorialClinico, { foreignKey: 'idCita', as: 'historial' });

HistorialClinico.belongsTo(Mascota, { foreignKey: 'idMascota', as: 'mascota' });
Mascota.hasMany(HistorialClinico, { foreignKey: 'idMascota', as: 'historiales' });

HistorialClinico.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(HistorialClinico, { foreignKey: 'idUsuario', as: 'historiales' });

module.exports = HistorialClinico;
