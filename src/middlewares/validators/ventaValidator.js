const { body, validationResult } = require('express-validator');
const Cliente = require('../../models/Cliente');

const TIPOS_COMPROBANTE = ['TICKET', 'BOLETA', 'FACTURA'];
const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN'];

function parsearProductos(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') {
    return JSON.parse(valor);
  }
  return valor;
}

const reglasVenta = [
  body('tipoComprobante')
    .trim()
    .notEmpty().withMessage('El tipo de comprobante es obligatorio.')
    .isIn(TIPOS_COMPROBANTE).withMessage('Tipo de comprobante no válido.'),

  body('metodoPago')
    .trim()
    .notEmpty().withMessage('El método de pago es obligatorio.')
    .isIn(METODOS_PAGO).withMessage('Método de pago no válido.'),

  body('idCliente')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('El cliente seleccionado no es válido.')
    .custom(async (valor, { req }) => {
      if (req.body.tipoComprobante === 'FACTURA') {
        if (!valor) {
          throw new Error('Debe seleccionar un cliente para emitir FACTURA.');
        }
        const cliente = await Cliente.findOne({ where: { id: valor, estado: 1 } });
        if (!cliente) {
          throw new Error('El cliente seleccionado no existe o no está activo.');
        }
      } else if (valor) {
        const cliente = await Cliente.findOne({ where: { id: valor, estado: 1 } });
        if (!cliente) {
          throw new Error('El cliente seleccionado no existe o no está activo.');
        }
      }
    }),

  body('productos')
    .notEmpty().withMessage('Debe agregar al menos un producto a la venta.')
    .custom((valor, { req }) => {
      let items;
      try {
        items = parsearProductos(valor);
      } catch {
        throw new Error('El formato de productos de la venta no es válido.');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Debe agregar al menos un producto a la venta.');
      }

      for (const item of items) {
        const idProducto = parseInt(item.idProducto, 10);
        const cantidad = parseInt(item.cantidad, 10);
        const precioUnitario = parseFloat(item.precioUnitario);

        if (!idProducto || idProducto < 1) {
          throw new Error('Hay un producto con identificador inválido.');
        }
        if (!cantidad || cantidad < 1) {
          throw new Error('La cantidad de cada producto debe ser al menos 1.');
        }
        if (Number.isNaN(precioUnitario) || precioUnitario <= 0) {
          throw new Error('El precio unitario de cada producto debe ser mayor a 0.');
        }
      }

      req.productosVenta = items;
      return true;
    }),
];

const validarVenta = async (req, res, next) => {
  await Promise.all(reglasVenta.map((regla) => regla.run(req)));

  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    req.flash('error', errores.array()[0].msg);
    return res.redirect('/ventas/crear');
  }

  return next();
};

module.exports = { validarVenta, TIPOS_COMPROBANTE, METODOS_PAGO };
