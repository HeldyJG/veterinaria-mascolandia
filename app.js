const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('express-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
require('dotenv').config();

const sequelize = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Configuración del motor de plantillas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// En producción (Render) el tráfico llega por proxy HTTPS
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Configuración de Sesión con persistencia en BD (PostgreSQL)
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'veterinaria_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS en producción
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false,
    },
  })
);

// Flash Messages
app.use(flash());

// Middleware para variables globales en las vistas (Usuario logueado, mensajes)
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.mensajes = {
    success: req.flash('success'),
    error: req.flash('error'),
  };
  res.locals.permisosNombres = req.session.permisosNombres || [];
  res.locals.tienePermiso = (nombre) =>
    (req.session.permisosNombres || []).includes(nombre);
  next();
});

// Normalizar rutas con "ñ" (baños) a ASCII (/banos) — evita 404 en Windows/Express
app.use((req, res, next) => {
  let path = req.path;
  try {
    if (path.includes('%')) {
      path = decodeURIComponent(path);
    }
  } catch (_) {
    /* mantener path original */
  }
  const fixed = path.replace(/\/baños/gi, '/banos');
  if (fixed !== req.path) {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, fixed + qs);
  }
  next();
});

// Ruta de prueba inicial
app.get('/test', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'success', message: 'Conexión a PostgreSQL y Express funcionando correctamente.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error de conexión a la base de datos: ' + error.message });
  }
});

// Rutas del Sistema
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const banoRoutes = require('./src/routes/banos');
const reporteRoutes = require('./src/routes/reportes');
const clienteRoutes = require('./src/routes/clientes');
const especieRoutes = require('./src/routes/especies');
const razaRoutes = require('./src/routes/razas');
const placeholderRoutes = require('./src/routes/placeholders');
const servicioRoutes = require('./src/routes/servicios');
const categoriaRoutes = require('./src/routes/categorias');
const proveedorRoutes = require('./src/routes/proveedores');
const mascotaRoutes = require('./src/routes/mascotas');
const citaRoutes = require('./src/routes/citas');
const historialClinicoRoutes = require('./src/routes/historial-clinico');
const productoRoutes = require('./src/routes/productos');
const examenRoutes = require('./src/routes/examenes');
const ventaRoutes = require('./src/routes/ventas');
const usuarioRoutes = require('./src/routes/usuarios');
const perfilRoutes = require('./src/routes/perfiles');
const redirectRoutes = require('./src/routes/redirects');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/baños', banoRoutes);
app.use('/banos', banoRoutes);
app.use('/reportes', reporteRoutes);
app.use('/', clienteRoutes);
app.use('/', especieRoutes);
app.use('/', razaRoutes);
app.use('/', servicioRoutes);
app.use('/', categoriaRoutes);
app.use('/', proveedorRoutes);
app.use('/', mascotaRoutes);
app.use('/', citaRoutes);
app.use('/', historialClinicoRoutes);
app.use('/', productoRoutes);
app.use('/', ventaRoutes);
app.use('/', usuarioRoutes);
app.use('/', perfilRoutes);
app.use('/', examenRoutes);
app.use('/', redirectRoutes);
app.use('/', placeholderRoutes);

// Ruta por defecto (Redirigir a login o dashboard)
app.get('/', (req, res) => {
  if (req.session.usuario) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Servidor
async function startServer() {
  try {
    // Sincronizar base de datos
    await sequelize.authenticate();
    console.log('📦 Conexión a la base de datos PostgreSQL establecida con éxito.');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de Veterinaria corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor debido a error en base de datos:', error);
  }
}

startServer();
