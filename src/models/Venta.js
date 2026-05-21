const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cliente = require('./Cliente');
const Usuario = require('./Usuario');

const Venta = sequelize.define('Venta', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idCliente: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'id_cliente',
  },
  idUsuario: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'id_usuario',
  },
  tipoComprobante: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'TICKET',
    validate: {
      isIn: [['BOLETA', 'FACTURA', 'TICKET']],
    },
    field: 'tipo_comprobante',
  },
  numeroComprobante: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'numero_comprobante',
  },
  metodoPago: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA']],
    },
    field: 'metodo_pago',
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  estado: {
    type: DataTypes.STRING(15),
    allowNull: false,
    defaultValue: 'COMPLETADA',
    validate: {
      isIn: [['COMPLETADA', 'ANULADA']],
    },
  },
  fechaVenta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_venta',
  },
}, {
  tableName: 'ventas',
  timestamps: false,
});

Venta.belongsTo(Cliente, { foreignKey: 'idCliente', as: 'cliente' });
Cliente.hasMany(Venta, { foreignKey: 'idCliente', as: 'ventas' });

Venta.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(Venta, { foreignKey: 'idUsuario', as: 'ventas' });

module.exports = Venta;
