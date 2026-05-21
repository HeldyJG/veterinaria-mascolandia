const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const HistorialClinico = require('./HistorialClinico');

const ExamenLaboratorio = sequelize.define('ExamenLaboratorio', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idHistorial: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_historial',
  },
  tipoExamen: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tipo_examen',
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  archivo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  resultado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fechaExamen: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_examen',
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
  nombreArchivo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'nombre_archivo',
  },
}, {
  tableName: 'examenes_laboratorio',
  timestamps: false,
});

ExamenLaboratorio.belongsTo(HistorialClinico, { foreignKey: 'idHistorial', as: 'historial' });
HistorialClinico.hasMany(ExamenLaboratorio, { foreignKey: 'idHistorial', as: 'examenes' });

module.exports = ExamenLaboratorio;
