const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Mascota = require('./Mascota');
const Usuario = require('./Usuario');
const Cita = require('./Cita');

const Bano = sequelize.define('Bano', {
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
  idCita: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'id_cita',
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  tipoServicio: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tipo_servicio',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pesoMascota: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'peso_mascota',
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDIENTE',
    validate: {
      isIn: [['PENDIENTE', 'EN_PROCESO', 'FINALIZADO', 'ENTREGADO']],
    },
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
  mlAcondicionador: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'ml_acondicionador',
  },
  mlShampoo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'ml_shampoo',
  },
  tamanoPerro: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'tamano_perro',
  },
}, {
  tableName: 'baños',
  timestamps: false,
});

Bano.belongsTo(Mascota, { foreignKey: 'idMascota', as: 'mascota' });
Mascota.hasMany(Bano, { foreignKey: 'idMascota', as: 'banos' });

Bano.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(Bano, { foreignKey: 'idUsuario', as: 'banos' });

Bano.belongsTo(Cita, { foreignKey: 'idCita', as: 'cita' });
Cita.hasMany(Bano, { foreignKey: 'idCita', as: 'banos' });

module.exports = Bano;
