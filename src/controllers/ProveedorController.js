const { Proveedor, Producto, CategoriaProducto } = require('../models');
const { Op } = require('sequelize');

class ProveedorController {
  /**
   * GET /proveedores
   * Lista todos los proveedores activos con búsqueda y paginación.
   */
  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina) || 1;
      const limite = 20;
      const offset = (pagina - 1) * limite;
      const busqueda = req.query.busqueda || '';

      const where = { estado: 1 };
      if (busqueda.trim()) {
        where[Op.or] = [
          { nombreEmpresa: { [Op.iLike]: `%${busqueda}%` } },
          { ruc: { [Op.iLike]: `%${busqueda}%` } },
          { telefono: { [Op.iLike]: `%${busqueda}%` } },
          { correo: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      const { count, rows: proveedores } = await Proveedor.findAndCountAll({
        where,
        order: [['nombreEmpresa', 'ASC']],
        limit: limite,
        offset,
      });

      const totalPaginas = Math.ceil(count / limite);

      res.render('proveedores/index', {
        title: 'Proveedores | Mascolandia',
        pageTitle: 'Gestión de Proveedores',
        activePage: '/proveedores',
        proveedores,
        busqueda,
        pagina,
        totalPaginas,
        totalRegistros: count,
      });
    } catch (error) {
      console.error('Error al listar proveedores:', error);
      req.flash('error', 'Error al cargar la lista de proveedores.');
      res.redirect('/dashboard');
    }
  }

  /**
   * GET /proveedores/crear
   * Renderiza el formulario de creación.
   */
  static async create(req, res) {
    return res.redirect('/proveedores?modal=modal-crear-proveedor');
  }

  /**
   * POST /proveedores
   * Guarda un nuevo proveedor en la base de datos.
   */
  static async store(req, res) {
    const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
      const { nombreEmpresa, ruc, telefono, correo, direccion } = req.body;

      await Proveedor.create({
        nombreEmpresa: nombreEmpresa.trim(),
        ruc: ruc ? ruc.trim() : null,
        telefono: telefono.trim(),
        correo: correo ? correo.trim() : null,
        direccion: direccion ? direccion.trim() : null,
        estado: 1,
      });

      if (isAjax) {
        return res.json({ success: true, message: `Proveedor "${nombreEmpresa}" registrado correctamente.` });
      }

      req.flash('success', `Proveedor "${nombreEmpresa}" registrado correctamente.`);
      res.redirect('/proveedores');
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      if (isAjax) {
        return res.status(500).json({ success: false, errors: ['Error al registrar el proveedor. Intente nuevamente.'] });
      }
      req.flash('error', 'Error al registrar el proveedor. Intente nuevamente.');
      res.redirect('/proveedores/crear');
    }
  }

  /**
   * GET /proveedores/:id
   * Muestra el detalle de un proveedor con sus productos asociados.
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const proveedor = await Proveedor.findOne({
        where: { id, estado: 1 },
      });

      if (!proveedor) {
        req.flash('error', 'Proveedor no encontrado.');
        return res.redirect('/proveedores');
      }

      // Cargar productos asociados al proveedor (activos e inactivos para historial completo)
      const productos = await Producto.findAll({
        where: { idProveedor: id },
        include: [
          { model: CategoriaProducto, as: 'categoria' },
        ],
        order: [['nombre', 'ASC']],
      });

      const productosActivos = productos.filter((p) => p.estado === 1);
      const productosInactivos = productos.filter((p) => p.estado === 0);

      res.render('proveedores/show', {
        title: `${proveedor.nombreEmpresa} | Mascolandia`,
        pageTitle: 'Detalle de Proveedor',
        activePage: '/proveedores',
        proveedor,
        productos,
        productosActivos,
        productosInactivos,
      });
    } catch (error) {
      console.error('Error al mostrar proveedor:', error);
      req.flash('error', 'Error al cargar el detalle del proveedor.');
      res.redirect('/proveedores');
    }
  }

  /**
   * GET /proveedores/:id/editar
   * Renderiza el formulario de edición con datos actuales.
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;

      const proveedor = await Proveedor.findOne({
        where: { id, estado: 1 },
      });

      if (!proveedor) {
        req.flash('error', 'Proveedor no encontrado.');
        return res.redirect('/proveedores');
      }

      res.render('proveedores/edit', {
        title: `Editar ${proveedor.nombreEmpresa} | Mascolandia`,
        pageTitle: 'Editar Proveedor',
        activePage: '/proveedores',
        proveedor,
      });
    } catch (error) {
      console.error('Error al cargar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición.');
      res.redirect('/proveedores');
    }
  }

  /**
   * PUT /proveedores/:id
   * Actualiza los datos de un proveedor existente.
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombreEmpresa, ruc, telefono, correo, direccion } = req.body;

      const proveedor = await Proveedor.findOne({
        where: { id, estado: 1 },
      });

      if (!proveedor) {
        req.flash('error', 'Proveedor no encontrado.');
        return res.redirect('/proveedores');
      }

      await proveedor.update({
        nombreEmpresa: nombreEmpresa.trim(),
        ruc: ruc ? ruc.trim() : null,
        telefono: telefono.trim(),
        correo: correo ? correo.trim() : null,
        direccion: direccion ? direccion.trim() : null,
      });

      req.flash('success', `Proveedor "${nombreEmpresa}" actualizado correctamente.`);
      res.redirect('/proveedores');
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      req.flash('error', 'Error al actualizar el proveedor. Intente nuevamente.');
      res.redirect(`/proveedores/${req.params.id}/editar`);
    }
  }

  /**
   * DELETE /proveedores/:id
   * Soft delete: establece estado = 0.
   * Bloquea la eliminación si existen productos activos asociados.
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const proveedor = await Proveedor.findOne({
        where: { id, estado: 1 },
      });

      if (!proveedor) {
        req.flash('error', 'Proveedor no encontrado.');
        return res.redirect('/proveedores');
      }

      // Verificar si existen productos activos asociados
      const productosActivos = await Producto.count({
        where: { idProveedor: id, estado: 1 },
      });

      if (productosActivos > 0) {
        req.flash(
          'error',
          `No se puede desactivar el proveedor "${proveedor.nombreEmpresa}" porque tiene ${productosActivos} producto(s) activo(s) asociado(s). Desactive los productos primero.`
        );
        return res.redirect('/proveedores');
      }

      await proveedor.update({ estado: 0 });

      req.flash('success', `Proveedor "${proveedor.nombreEmpresa}" desactivado correctamente.`);
      res.redirect('/proveedores');
    } catch (error) {
      console.error('Error al desactivar proveedor:', error);
      req.flash('error', 'Error al desactivar el proveedor. Intente nuevamente.');
      res.redirect('/proveedores');
    }
  }
}

module.exports = ProveedorController;
