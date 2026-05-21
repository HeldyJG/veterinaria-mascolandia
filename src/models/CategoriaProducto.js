const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CategoriaProducto = sequelize.define('CategoriaProducto', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'categorias_productos',
  timestamps: false,
});

module.exports = CategoriaProducto;
