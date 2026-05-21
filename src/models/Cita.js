const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Mascota = require('./Mascota');
const Usuario = require('./Usuario');
const Servicio = require('./Servicio');

const Cita = sequelize.define('Cita', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
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
  idServicio: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_servicio',
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  turno: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['MANANA', 'TARDE']],
    },
  },
  motivoDetalle: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_detalle',
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['ATENDIDA', 'CANCELADA', 'CONFIRMADA', 'EN_ESPERA', 'PENDIENTE']],
    },
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
}, {
  tableName: 'citas',
  timestamps: false,
});

Cita.belongsTo(Mascota, { foreignKey: 'idMascota', as: 'mascota' });
Mascota.hasMany(Cita, { foreignKey: 'idMascota', as: 'citas' });

Cita.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(Cita, { foreignKey: 'idUsuario', as: 'citas' });

Cita.belongsTo(Servicio, { foreignKey: 'idServicio', as: 'servicio' });
Servicio.hasMany(Cita, { foreignKey: 'idServicio', as: 'citas' });

module.exports = Cita;
