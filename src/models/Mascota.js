const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cliente = require('./Cliente');
const Raza = require('./Raza');

const Mascota = sequelize.define('Mascota', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  idCliente: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_cliente',
  },
  idRaza: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_raza',
  },
  sexo: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  fechaNacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_nacimiento',
  },
  pesoActual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'peso_actual',
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  foto: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'mascotas',
  timestamps: false,
});

Mascota.belongsTo(Cliente, { foreignKey: 'idCliente', as: 'cliente' });
Cliente.hasMany(Mascota, { foreignKey: 'idCliente', as: 'mascotas' });

Mascota.belongsTo(Raza, { foreignKey: 'idRaza', as: 'raza' });
Raza.hasMany(Mascota, { foreignKey: 'idRaza', as: 'mascotas' });

module.exports = Mascota;
