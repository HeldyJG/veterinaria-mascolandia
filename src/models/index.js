const Perfil = require('./Perfil');
const Opcion = require('./Opcion');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Mascota = require('./Mascota');
const Especie = require('./Especie');
const Raza = require('./Raza');
const Servicio = require('./Servicio');
const Cita = require('./Cita');
const HistorialClinico = require('./HistorialClinico');
const ExamenLaboratorio = require('./ExamenLaboratorio');
const Bano = require('./Bano');
const BanoStock = require('./BanoStock');
const BanoDetalleProducto = require('./BanoDetalleProducto');
const CategoriaProducto = require('./CategoriaProducto');
const Proveedor = require('./Proveedor');
const Producto = require('./Producto');
const Venta = require('./Venta');
const VentaDetalle = require('./VentaDetalle');

// ============================================================
// RELACIONES ADICIONALES (Muchos a Muchos y otras)
// ============================================================

// Perfiles y Opciones (Muchos a Muchos)
Perfil.belongsToMany(Opcion, {
  through: 'perfil_opcion',
  foreignKey: 'id_perfil',
  otherKey: 'id_opcion',
  as: 'opciones',
  timestamps: false
});

Opcion.belongsToMany(Perfil, {
  through: 'perfil_opcion',
  foreignKey: 'id_opcion',
  otherKey: 'id_perfil',
  as: 'perfiles',
  timestamps: false
});

// Opcion - Relación jerárquica (Submenús)
Opcion.belongsTo(Opcion, { foreignKey: 'idPadre', as: 'padre' });
Opcion.hasMany(Opcion, { foreignKey: 'idPadre', as: 'subopciones' });

module.exports = {
  Perfil,
  Opcion,
  Usuario,
  Cliente,
  Mascota,
  Especie,
  Raza,
  Servicio,
  Cita,
  HistorialClinico,
  ExamenLaboratorio,
  Bano,
  BanoStock,
  BanoDetalleProducto,
  CategoriaProducto,
  Proveedor,
  Producto,
  Venta,
  VentaDetalle
};
