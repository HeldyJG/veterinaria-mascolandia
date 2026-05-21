const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Perfil = require('./Perfil');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  usuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  clave: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  idPerfil: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_perfil',
  },
}, {
  tableName: 'usuarios',
  timestamps: false,
});

// Relaciones
Usuario.belongsTo(Perfil, { foreignKey: 'idPerfil', as: 'perfil' });
Perfil.hasMany(Usuario, { foreignKey: 'idPerfil', as: 'usuarios' });

module.exports = Usuario;
