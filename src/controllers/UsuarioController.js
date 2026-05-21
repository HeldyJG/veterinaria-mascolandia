const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Usuario, Perfil } = require('../models');
const { invalidarPermisosSesion } = require('../middlewares/auth');

const REGISTROS_POR_PAGINA = 20;
const BCRYPT_ROUNDS = 10;

class UsuarioController {
  static async eliminarSesionesUsuario(idUsuario) {
    try {
      await sequelize.query(
        `DELETE FROM sessions
         WHERE sess IS NOT NULL
           AND (sess::jsonb -> 'usuario' ->> 'id')::bigint = :idUsuario`,
        { replacements: { idUsuario } }
      );
    } catch (error) {
      console.error('Error al eliminar sesiones del usuario:', error);
    }
  }

  static async index(req, res) {
    try {
      const pagina = parseInt(req.query.pagina, 10) || 1;
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const estado = req.query.estado !== undefined && req.query.estado !== '' ? parseInt(req.query.estado, 10) : '';
      const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

      const whereClause = {};

      if (busqueda) {
        whereClause[Op.or] = [
          { nombre: { [Op.iLike]: `%${busqueda}%` } },
          { usuario: { [Op.iLike]: `%${busqueda}%` } },
          { correo: { [Op.iLike]: `%${busqueda}%` } },
        ];
      }

      if (estado === 0 || estado === 1) {
        whereClause.estado = estado;
      }

      const { count, rows: usuarios } = await Usuario.findAndCountAll({
        where: whereClause,
        include: [{ model: Perfil, as: 'perfil', attributes: ['id', 'nombre'] }],
        order: [
          ['estado', 'DESC'],
          ['nombre', 'ASC'],
        ],
        limit: REGISTROS_POR_PAGINA,
        offset,
      });

      const totalPaginas = Math.ceil(count / REGISTROS_POR_PAGINA);

      const perfiles = await Perfil.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      res.render('usuarios/index', {
        title: 'Usuarios | Mascolandia',
        pageTitle: 'Gestión de Usuarios',
        activePage: '/usuarios',
        usuarios,
        busqueda,
        estado: req.query.estado ?? '',
        pagina,
        totalPaginas,
        totalRegistros: count,
        usuarioActualId: req.session.usuario.id,
        perfiles,
      });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      req.flash('error', 'Error al cargar la lista de usuarios.');
      res.redirect('/dashboard');
    }
  }

  static async create(req, res) {
    return res.redirect('/usuarios?modal=modal-crear-usuario');
  }

  static async store(req, res) {
    try {
      const { nombre, usuario, correo, idPerfil, clave } = req.body;
      const claveHash = await bcrypt.hash(clave, BCRYPT_ROUNDS);

      await Usuario.create({
        nombre: nombre.trim(),
        usuario: usuario.trim(),
        correo: correo ? correo.trim() : null,
        idPerfil: parseInt(idPerfil, 10),
        clave: claveHash,
        estado: 1,
      });

      req.flash('success', 'Usuario registrado correctamente.');
      res.redirect('/usuarios');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      req.flash('error', 'Error al registrar el usuario. Intente nuevamente.');
      res.redirect('/usuarios/crear');
    }
  }

  static async edit(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.params.id, {
        include: [{ model: Perfil, as: 'perfil' }],
      });

      if (!usuario) {
        req.flash('error', 'Usuario no encontrado.');
        return res.redirect('/usuarios');
      }

      const perfiles = await Perfil.findAll({
        where: { estado: 1 },
        order: [['nombre', 'ASC']],
      });

      res.render('usuarios/edit', {
        title: `Editar ${usuario.nombre} | Mascolandia`,
        pageTitle: 'Editar Usuario',
        activePage: '/usuarios',
        usuario,
        perfiles,
      });
    } catch (error) {
      console.error('Error al editar usuario:', error);
      req.flash('error', 'Error al cargar el usuario.');
      res.redirect('/usuarios');
    }
  }

  static async update(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.params.id);

      if (!usuario) {
        req.flash('error', 'Usuario no encontrado.');
        return res.redirect('/usuarios');
      }

      const { nombre, usuario: username, correo, idPerfil } = req.body;

      await usuario.update({
        nombre: nombre.trim(),
        usuario: username.trim(),
        correo: correo ? correo.trim() : null,
        idPerfil: parseInt(idPerfil, 10),
      });

      if (parseInt(req.session.usuario.id, 10) === parseInt(usuario.id, 10)) {
        const perfil = await Perfil.findByPk(usuario.idPerfil);
        req.session.usuario.nombre = usuario.nombre;
        req.session.usuario.usuario = usuario.usuario;
        req.session.usuario.correo = usuario.correo;
        req.session.usuario.idPerfil = usuario.idPerfil;
        req.session.usuario.perfilNombre = perfil ? perfil.nombre : 'Sin Perfil';
        invalidarPermisosSesion(req);
      }

      req.flash('success', 'Usuario actualizado correctamente.');
      res.redirect('/usuarios');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      req.flash('error', 'Error al actualizar el usuario.');
      res.redirect(`/usuarios/${req.params.id}/editar`);
    }
  }

  static async cambiarClaveForm(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.params.id, {
        include: [{ model: Perfil, as: 'perfil' }],
      });

      if (!usuario) {
        req.flash('error', 'Usuario no encontrado.');
        return res.redirect('/usuarios');
      }

      const esPropio = parseInt(req.session.usuario.id, 10) === parseInt(usuario.id, 10);

      res.render('usuarios/cambiar-clave', {
        title: `Cambiar contraseña | ${usuario.nombre}`,
        pageTitle: 'Cambiar Contraseña',
        activePage: '/usuarios',
        usuario,
        esPropio,
      });
    } catch (error) {
      console.error('Error al cargar cambio de clave:', error);
      req.flash('error', 'Error al cargar el formulario.');
      res.redirect('/usuarios');
    }
  }

  static async cambiarClave(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.params.id);

      if (!usuario) {
        req.flash('error', 'Usuario no encontrado.');
        return res.redirect('/usuarios');
      }

      const esPropio = parseInt(req.session.usuario.id, 10) === parseInt(usuario.id, 10);
      const { claveActual, claveNueva } = req.body;

      if (esPropio) {
        if (!claveActual) {
          req.flash('error', 'Debe ingresar su contraseña actual.');
          return res.redirect(`/usuarios/${usuario.id}/cambiar-clave`);
        }

        const coincide = await bcrypt.compare(claveActual, usuario.clave);
        if (!coincide) {
          req.flash('error', 'La contraseña actual no es correcta.');
          return res.redirect(`/usuarios/${usuario.id}/cambiar-clave`);
        }
      }

      const claveHash = await bcrypt.hash(claveNueva, BCRYPT_ROUNDS);
      await usuario.update({ clave: claveHash });

      if (!esPropio) {
        await UsuarioController.eliminarSesionesUsuario(usuario.id);
      }

      req.flash('success', 'Contraseña actualizada correctamente.');
      res.redirect(esPropio ? '/dashboard' : '/usuarios');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      req.flash('error', 'Error al cambiar la contraseña.');
      res.redirect(`/usuarios/${req.params.id}/cambiar-clave`);
    }
  }

  static async destroy(req, res) {
    try {
      const id = parseInt(req.params.id, 10);

      if (id === parseInt(req.session.usuario.id, 10)) {
        req.flash('error', 'No puede desactivar su propia cuenta.');
        return res.redirect('/usuarios');
      }

      const usuario = await Usuario.findByPk(id);

      if (!usuario) {
        req.flash('error', 'Usuario no encontrado.');
        return res.redirect('/usuarios');
      }

      if (usuario.estado === 0) {
        req.flash('error', 'Este usuario ya está inactivo.');
        return res.redirect('/usuarios');
      }

      await usuario.update({ estado: 0 });
      await UsuarioController.eliminarSesionesUsuario(usuario.id);

      req.flash('success', `Usuario "${usuario.nombre}" desactivado correctamente.`);
      res.redirect('/usuarios');
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      req.flash('error', 'Error al desactivar el usuario.');
      res.redirect('/usuarios');
    }
  }
}

module.exports = UsuarioController;
