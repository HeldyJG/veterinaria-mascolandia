const { Perfil, Opcion, Usuario } = require('../models');
const sequelize = require('../config/database');

class PerfilController {
  static async index(req, res) {
    try {
      const perfiles = await Perfil.findAll({
        where: { estado: 1 },
        include: [
          {
            model: Opcion,
            as: 'opciones',
            attributes: ['id'],
            through: { attributes: [] },
          },
        ],
        order: [['nombre', 'ASC']],
      });

      const perfilesConDatos = await Promise.all(
        perfiles.map(async (perfil) => {
          const data = perfil.toJSON();
          data.totalOpciones = data.opciones ? data.opciones.length : 0;
          data.totalUsuarios = await Usuario.count({
            where: { idPerfil: perfil.id, estado: 1 },
          });
          return data;
        })
      );

      res.render('perfiles/index', {
        title: 'Gestión de Perfiles y Permisos | Mascolandia',
        pageTitle: 'Perfiles y Permisos del Sistema',
        activePage: '/perfiles/listar',
        perfiles: perfilesConDatos,
      });
    } catch (error) {
      console.error('Error al listar perfiles:', error);
      req.flash('error', 'Error al cargar los perfiles.');
      res.redirect('/dashboard');
    }
  }

  static async editPermisos(req, res) {
    try {
      const perfil = await Perfil.findOne({
        where: { id: req.params.id, estado: 1 },
        include: [
          {
            model: Opcion,
            as: 'opciones',
            through: { attributes: [] },
          },
        ],
      });

      if (!perfil) {
        req.flash('error', 'Perfil no encontrado.');
        return res.redirect('/perfiles/listar');
      }

      const todasOpciones = await Opcion.findAll({
        order: [
          ['orden', 'ASC'],
          ['id', 'ASC'],
        ],
      });

      const asignadasIds = new Set(perfil.opciones.map((o) => String(o.id)));

      const grupos = todasOpciones
        .filter((o) => o.idPadre === null)
        .map((padre) => ({
          ...padre.toJSON(),
          hijos: todasOpciones
            .filter((o) => String(o.idPadre) === String(padre.id))
            .map((h) => h.toJSON()),
        }));

      res.render('perfiles/permisos', {
        title: `Permisos: ${perfil.nombre} | Mascolandia`,
        pageTitle: `Permisos del perfil: ${perfil.nombre}`,
        activePage: '/perfiles/listar',
        perfil: perfil.toJSON(),
        grupos,
        asignadasIds: [...asignadasIds],
      });
    } catch (error) {
      console.error('Error al cargar permisos del perfil:', error);
      req.flash('error', 'Error al cargar los permisos del perfil.');
      res.redirect('/perfiles/listar');
    }
  }

  static async updatePermisos(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const perfil = await Perfil.findOne({
        where: { id: req.params.id, estado: 1 },
        transaction,
      });

      if (!perfil) {
        await transaction.rollback();
        req.flash('error', 'Perfil no encontrado.');
        return res.redirect('/perfiles/listar');
      }

      let idsOpciones = req.body.opciones || [];
      if (!Array.isArray(idsOpciones)) {
        idsOpciones = [idsOpciones];
      }
      idsOpciones = idsOpciones.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));

      const opcionesValidas = await Opcion.findAll({
        where: { id: idsOpciones },
        transaction,
      });

      await perfil.setOpciones(opcionesValidas, { transaction });
      await transaction.commit();

      if (parseInt(req.session.usuario.idPerfil, 10) === parseInt(perfil.id, 10)) {
        const { invalidarPermisosSesion } = require('../middlewares/auth');
        invalidarPermisosSesion(req);
      }

      req.flash('success', `Permisos del perfil "${perfil.nombre}" actualizados correctamente.`);
      res.redirect('/perfiles/listar');
    } catch (error) {
      await transaction.rollback();
      console.error('Error al actualizar permisos:', error);
      req.flash('error', 'Error al guardar los permisos del perfil.');
      res.redirect(`/perfiles/${req.params.id}/permisos`);
    }
  }
}

module.exports = PerfilController;
