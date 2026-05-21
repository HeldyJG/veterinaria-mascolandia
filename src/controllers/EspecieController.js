const { Especie, Raza } = require('../models');
const sequelize = require('../config/database');

class EspecieController {
  // GET /especies - Listar todas las especies activas con conteo de razas
  static async index(req, res) {
    try {
      const especies = await Especie.findAll({
        where: { estado: 1 },
        include: [
          {
            model: Raza,
            as: 'razas',
            where: { estado: 1 },
            required: false,
          },
        ],
        order: [['nombre', 'ASC']],
      });

      res.render('especies/index', {
        title: 'Gestión de Especies | Mascolandia',
        pageTitle: 'Especies',
        activePage: '/especies',
        especies,
      });
    } catch (error) {
      console.error('Error al listar especies:', error);
      req.flash('error', 'Error al cargar las especies.');
      res.redirect('/dashboard');
    }
  }

  // POST /especies - Crear nueva especie
  static async store(req, res) {
    try {
      const { nombre } = req.body;

      await Especie.create({ nombre: nombre.trim() });

      req.flash('success', 'Especie creada correctamente.');
      res.redirect('/especies');
    } catch (error) {
      console.error('Error al crear especie:', error);
      req.flash('error', 'Error al crear la especie.');
      res.redirect('/especies');
    }
  }

  // PUT /especies/:id - Actualizar especie
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre } = req.body;

      const especie = await Especie.findByPk(id);
      if (!especie || especie.estado === 0) {
        req.flash('error', 'Especie no encontrada.');
        return res.redirect('/especies');
      }

      especie.nombre = nombre.trim();
      await especie.save();

      req.flash('success', 'Especie actualizada correctamente.');
      res.redirect('/especies');
    } catch (error) {
      console.error('Error al actualizar especie:', error);
      req.flash('error', 'Error al actualizar la especie.');
      res.redirect('/especies');
    }
  }

  // DELETE /especies/:id - Desactivar especie y sus razas en cascada
  static async destroy(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;

      const especie = await Especie.findByPk(id, { transaction });
      if (!especie || especie.estado === 0) {
        await transaction.rollback();
        req.flash('error', 'Especie no encontrada.');
        return res.redirect('/especies');
      }

      // Desactivar todas las razas asociadas en cascada
      await Raza.update(
        { estado: 0 },
        { where: { idEspecie: id, estado: 1 }, transaction }
      );

      // Desactivar la especie
      especie.estado = 0;
      await especie.save({ transaction });

      await transaction.commit();
      req.flash('success', 'Especie y sus razas asociadas han sido desactivadas.');
      res.redirect('/especies');
    } catch (error) {
      await transaction.rollback();
      console.error('Error al desactivar especie:', error);
      req.flash('error', 'Error al desactivar la especie.');
      res.redirect('/especies');
    }
  }
}

module.exports = EspecieController;
