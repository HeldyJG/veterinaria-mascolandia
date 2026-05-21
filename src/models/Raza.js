const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Especie = require('./Especie');

const Raza = sequelize.define('Raza', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  idEspecie: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_especie',
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'razas',
  timestamps: false,
});

Raza.belongsTo(Especie, { foreignKey: 'idEspecie', as: 'especie' });
Especie.hasMany(Raza, { foreignKey: 'idEspecie', as: 'razas' });

module.exports = Raza;
