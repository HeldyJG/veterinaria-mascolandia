const { Op } = require('sequelize');
const { Raza, Especie, Mascota } = require('../models');

class RazaController {
  // GET /razas - Listar razas activas, con filtro opcional por especie
  static async index(req, res) {
    try {
      const { idEspecie } = req.query;

      const where = { estado: 1 };
      if (idEspecie) {
        where.idEspecie = idEspecie;
      }

      const [razas, especies] = await Promise.all([
        Raza.findAll({
          where,
          include: [{ model: Especie, as: 'especie' }],
          order: [
            [{ model: Especie, as: 'especie' }, 'nombre', 'ASC'],
            ['nombre', 'ASC'],
          ],
        }),
        Especie.findAll({ where: { estado: 1 }, order: [['nombre', 'ASC']] }),
      ]);

      res.render('razas/index', {
        title: 'Gestión de Razas | Mascolandia',
        pageTitle: 'Razas',
        activePage: '/razas',
        razas,
        especies,
        idEspecieFiltro: idEspecie || '',
      });
    } catch (error) {
      console.error('Error al listar razas:', error);
      req.flash('error', 'Error al cargar las razas.');
      res.redirect('/dashboard');
    }
  }

  // POST /razas - Crear nueva raza
  static async store(req, res) {
    try {
      const { nombre, idEspecie } = req.body;

      await Raza.create({
        nombre: nombre.trim(),
        idEspecie: parseInt(idEspecie),
      });

      req.flash('success', 'Raza creada correctamente.');
      res.redirect('/razas');
    } catch (error) {
      console.error('Error al crear raza:', error);
      req.flash('error', 'Error al crear la raza.');
      res.redirect('/razas');
    }
  }

  // PUT /razas/:id - Actualizar raza
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, idEspecie } = req.body;

      const raza = await Raza.findByPk(id);
      if (!raza || raza.estado === 0) {
        req.flash('error', 'Raza no encontrada.');
        return res.redirect('/razas');
      }

      raza.nombre = nombre.trim();
      raza.idEspecie = parseInt(idEspecie);
      await raza.save();

      req.flash('success', 'Raza actualizada correctamente.');
      res.redirect('/razas');
    } catch (error) {
      console.error('Error al actualizar raza:', error);
      req.flash('error', 'Error al actualizar la raza.');
      res.redirect('/razas');
    }
  }

  // DELETE /razas/:id - Desactivar raza (soft delete)
  // Valida que no existan mascotas activas asociadas antes de eliminar
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      const raza = await Raza.findByPk(id);
      if (!raza || raza.estado === 0) {
        req.flash('error', 'Raza no encontrada.');
        return res.redirect('/razas');
      }

      // Verificar que no existan mascotas activas asociadas
      const mascotasActivas = await Mascota.count({
        where: { idRaza: id, estado: 1 },
      });

      if (mascotasActivas > 0) {
        req.flash(
          'error',
          `No se puede eliminar la raza porque tiene ${mascotasActivas} mascota(s) activa(s) asociada(s).`
        );
        return res.redirect('/razas');
      }

      raza.estado = 0;
      await raza.save();

      req.flash('success', 'Raza desactivada correctamente.');
      res.redirect('/razas');
    } catch (error) {
      console.error('Error al desactivar raza:', error);
      req.flash('error', 'Error al desactivar la raza.');
      res.redirect('/razas');
    }
  }

  // GET /api/razas/:idEspecie - API para obtener razas por especie (usado en formularios AJAX)
  static async porEspecie(req, res) {
    try {
      const { idEspecie } = req.params;

      const razas = await Raza.findAll({
        where: { idEspecie, estado: 1 },
        order: [['nombre', 'ASC']],
        attributes: ['id', 'nombre'],
      });

      res.json({ success: true, data: razas });
    } catch (error) {
      console.error('Error al obtener razas por especie:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/razas/search?q=
   * Busca razas por nombre (autocomplete).
   */
  static async search(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';

      const where = { estado: 1 };
      if (q.length > 0) {
        where.nombre = { [Op.iLike]: `%${q}%` };
      }

      const razas = await Raza.findAll({
        where,
        limit: 10,
        order: [['nombre', 'ASC']],
        attributes: ['id', 'nombre'],
      });

      return res.json({ success: true, data: razas });
    } catch (error) {
      console.error('Error al buscar razas:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = RazaController;
