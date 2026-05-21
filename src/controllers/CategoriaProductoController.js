const { CategoriaProducto, Producto } = require('../models');

class CategoriaProductoController {
  /**
   * index - Listar todas las categorías activas con conteo de productos
   * GET /categorias-productos/listar
   */
  static async index(req, res) {
    try {
      const categorias = await CategoriaProducto.findAll({
        where: { estado: 1 },
        include: [
          {
            model: Producto,
            as: 'productos',
            attributes: ['id', 'estado'],
          },
        ],
        order: [['nombre', 'ASC']],
      });

      // Calcular conteo de productos activos por categoría
      const categoriasConConteo = categorias.map((cat) => {
        const data = cat.toJSON();
        data.totalProductos = data.productos
          ? data.productos.filter((p) => p.estado === 1).length
          : 0;
        return data;
      });

      res.render('categorias/index', {
        title: 'Categorías de Productos | Mascolandia',
        pageTitle: 'Categorías de Productos',
        activePage: '/categorias-productos/listar',
        categorias: categoriasConConteo,
      });
    } catch (error) {
      console.error('Error al listar categorías:', error);
      req.flash('error', 'Error al cargar las categorías.');
      res.redirect('/dashboard');
    }
  }

  /**
   * store - Crear nueva categoría
   * POST /categorias-productos
   */
  static async store(req, res) {
    try {
      const { nombre, descripcion } = req.body;

      await CategoriaProducto.create({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        estado: 1,
      });

      req.flash('success', 'Categoría creada correctamente.');
      res.redirect('/categorias-productos/listar');
    } catch (error) {
      console.error('Error al crear categoría:', error);
      req.flash('error', 'Error al crear la categoría.');
      res.redirect('/categorias-productos/listar');
    }
  }

  /**
   * update - Actualizar categoría existente
   * PUT /categorias-productos/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      const categoria = await CategoriaProducto.findOne({
        where: { id, estado: 1 },
      });

      if (!categoria) {
        req.flash('error', 'Categoría no encontrada.');
        return res.redirect('/categorias-productos/listar');
      }

      await categoria.update({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
      });

      req.flash('success', 'Categoría actualizada correctamente.');
      res.redirect('/categorias-productos/listar');
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      req.flash('error', 'Error al actualizar la categoría.');
      res.redirect('/categorias-productos/listar');
    }
  }

  /**
   * destroy - Soft delete de categoría (estado = 0)
   * DELETE /categorias-productos/:id
   * Valida que no existan productos activos asociados antes de eliminar
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const categoria = await CategoriaProducto.findOne({
        where: { id, estado: 1 },
      });

      if (!categoria) {
        req.flash('error', 'Categoría no encontrada.');
        return res.redirect('/categorias-productos/listar');
      }

      // Verificar que no existan productos activos asociados (Req 8.3)
      const productosActivos = await Producto.count({
        where: { idCategoria: id, estado: 1 },
      });

      if (productosActivos > 0) {
        req.flash(
          'error',
          `No se puede eliminar la categoría porque tiene ${productosActivos} producto(s) activo(s) asociado(s).`
        );
        return res.redirect('/categorias-productos/listar');
      }

      // Soft delete: estado = 0 (Req 8.4)
      await categoria.update({ estado: 0 });

      req.flash('success', 'Categoría desactivada correctamente.');
      res.redirect('/categorias-productos/listar');
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      req.flash('error', 'Error al eliminar la categoría.');
      res.redirect('/categorias-productos/listar');
    }
  }
}

module.exports = CategoriaProductoController;
