const bcrypt = require('bcryptjs');
const { Usuario, Perfil } = require('../models');
const { cargarPermisosSesion } = require('../middlewares/auth');

class AuthController {
  // Renderizar la vista de Login
  static getLogin(req, res) {
    res.render('auth/login', { title: 'Iniciar Sesión | Mascolandia' });
  }

  // Procesar el login
  static async postLogin(req, res) {
    const { username, password } = req.body;

    try {
      if (!username || !password) {
        req.flash('error', 'Por favor, ingrese todos los campos.');
        return res.redirect('/auth/login');
      }

      // Buscar usuario activo
      const usuario = await Usuario.findOne({
        where: { usuario: username, estado: 1 },
        include: [{ model: Perfil, as: 'perfil' }],
      });

      if (!usuario) {
        req.flash('error', 'Usuario o contraseña incorrectos, o usuario inactivo.');
        return res.redirect('/auth/login');
      }

      // Validar contraseña
      const passwordMatch = await bcrypt.compare(password, usuario.clave);
      if (!passwordMatch) {
        req.flash('error', 'Usuario o contraseña incorrectos.');
        return res.redirect('/auth/login');
      }

      // Guardar en sesión
      req.session.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        correo: usuario.correo,
        idPerfil: usuario.idPerfil,
        perfilNombre: usuario.perfil ? usuario.perfil.nombre : 'Sin Perfil',
      };

      const permisosOk = await cargarPermisosSesion(req);
      if (!permisosOk) {
        req.session.destroy();
        req.flash('error', 'El perfil de su usuario no está configurado correctamente.');
        return res.redirect('/auth/login');
      }

      req.flash('success', `¡Bienvenido de nuevo, ${usuario.nombre}!`);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error en postLogin:', error);
      req.flash('error', 'Ocurrió un error interno en el servidor.');
      res.redirect('/auth/login');
    }
  }

  // Cierre de sesión
  static logout(req, res) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destruyendo sesión:', err);
      }
      res.redirect('/auth/login');
    });
  }
}

module.exports = AuthController;
