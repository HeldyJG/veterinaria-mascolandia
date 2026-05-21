const { Perfil, Opcion } = require('../models');

const RUTA_ALIASES = {
  '/clientes/listar': '/clientes',
  '/mascotas/listar': '/mascotas',
  '/citas/listar': '/citas',
  '/servicios/listar': '/servicios',
  '/especies/listar': '/especies',
  '/razas/listar': '/razas',
  '/productos/listar': '/productos',
  '/proveedores/listar': '/proveedores',
  '/historial/listar': '/historial-clinico',
  '/examenes/listar': '/historial-clinico',
  '/ventas/listar': '/ventas',
  '/usuarios/listar': '/usuarios',
  '/baños/listar': '/banos/listar',
  '/banos/listar': '/banos/listar',
};

/** Rutas de permiso (BD) → prefijos reales de Express */
const PERMISO_A_PREFIJOS = {
  '/': ['/dashboard'],
  '/historial/listar': ['/historial-clinico', '/examenes-laboratorio'],
  '/examenes/listar': ['/historial-clinico', '/examenes-laboratorio'],
  '/historial-clinico': ['/historial-clinico', '/examenes-laboratorio'],
  '/banos/listar': ['/banos', '/baños'],
  '/baños/listar': ['/banos', '/baños'],
  '/perfiles/listar': ['/perfiles'],
  '/reportes/listar': ['/reportes'],
  '/categorias-productos/listar': ['/categorias-productos'],
};

const RUTAS_SIN_PERMISO = ['/auth', '/test'];

function normalizarRuta(ruta) {
  if (!ruta) return ruta;
  const limpia = String(ruta).trim().replace(/\n/g, '');
  return RUTA_ALIASES[limpia] || limpia;
}

function normalizarMenu(menu) {
  return menu.map((padre) => ({
    ...padre,
    ruta: normalizarRuta(padre.ruta),
    subopciones: (padre.subopciones || []).map((hijo) => ({
      ...hijo,
      ruta: normalizarRuta(hijo.ruta),
    })),
  }));
}

function permisoRutaAPrefijos(rutaPermiso) {
  const normalizada = normalizarRuta(rutaPermiso);
  if (!normalizada || normalizada.startsWith('#')) return [];

  if (PERMISO_A_PREFIJOS[normalizada]) {
    return PERMISO_A_PREFIJOS[normalizada];
  }
  if (PERMISO_A_PREFIJOS[rutaPermiso]) {
    return PERMISO_A_PREFIJOS[rutaPermiso];
  }

  if (normalizada === '/') return ['/dashboard'];
  const base = normalizada.replace(/\/listar$/, '');
  return [base || normalizada];
}

function buildPermisosRutas(opciones) {
  const prefijos = new Set();
  opciones.forEach((o) => {
    permisoRutaAPrefijos(o.ruta).forEach((p) => prefijos.add(p));
  });
  return [...prefijos];
}

function buildMenu(opciones) {
  const padres = opciones
    .filter((o) => o.idPadre === null)
    .sort((a, b) => a.orden - b.orden);

  return padres.map((padre) => {
    const hijos = opciones
      .filter((o) => o.idPadre === padre.id)
      .sort((a, b) => a.orden - b.orden);
    return { ...padre, subopciones: hijos };
  });
}

async function cargarPermisosSesion(req, res) {
  const perfil = await Perfil.findByPk(req.session.usuario.idPerfil, {
    include: [
      {
        model: Opcion,
        as: 'opciones',
        through: { attributes: [] },
      },
    ],
  });

  if (!perfil) {
    return false;
  }

  const opciones = perfil.opciones.map((o) => {
    const obj = o.toJSON();
    obj.ruta = normalizarRuta(obj.ruta);
    return obj;
  });

  const menu = buildMenu(opciones);
  const permisosRutas = buildPermisosRutas(opciones);
  const permisosNombres = opciones.map((o) => o.nombre);

  req.session.menu = menu;
  req.session.permisos = opciones;
  req.session.permisosRutas = permisosRutas;
  req.session.permisosNombres = permisosNombres;

  res.locals.menu = menu;
  res.locals.permisosNombres = permisosNombres;

  return true;
}

function usuarioTienePermiso(req, nombreOpcion) {
  const nombres = req.session.permisosNombres || [];
  return nombres.includes(nombreOpcion);
}

/** Ruta real de la petición (req.path pierde el prefijo del router montado). */
function obtenerRutaCompleta(req) {
  const base = req.baseUrl || '';
  const path = req.path || '/';
  if (!base) return path;
  if (path === '/') return base;
  return `${base}${path}`;
}

function esRutaPublica(path) {
  return RUTAS_SIN_PERMISO.some((p) => path === p || path.startsWith(p + '/'));
}

function esRutaLibreAutenticado(path) {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}

function tieneAccesoRuta(path, permisosRutas) {
  if (esRutaLibreAutenticado(path)) return true;
  if (!permisosRutas || permisosRutas.length === 0) return false;

  return permisosRutas.some(
    (prefijo) => path === prefijo || path.startsWith(prefijo + '/')
  );
}

function denegarAcceso(req, res, mensaje) {
  const ruta = obtenerRutaCompleta(req);
  const esApi =
    ruta.includes('/api/') ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (esApi) {
    return res.status(403).json({ success: false, message: mensaje });
  }

  req.flash('error', mensaje);
  return res.redirect('/dashboard');
}

function verificarAccesoRuta(req, res) {
  const ruta = obtenerRutaCompleta(req);

  if (esRutaPublica(ruta)) return true;

  const permisosRutas = req.session.permisosRutas || [];
  if (tieneAccesoRuta(ruta, permisosRutas)) return true;

  denegarAcceso(
    req,
    res,
    'No tiene permiso para acceder a este módulo. Contacte al administrador.'
  );
  return false;
}

const reqAuth = async (req, res, next) => {
  if (!req.session.usuario) {
    req.flash('error', 'Debes iniciar sesión para acceder a este recurso.');
    return res.redirect('/auth/login');
  }

  try {
    if (!req.session.permisosRutas || !req.session.menu) {
      const ok = await cargarPermisosSesion(req, res);
      if (!ok) {
        req.session.destroy();
        req.flash('error', 'El perfil de tu usuario no existe.');
        return res.redirect('/auth/login');
      }
    } else {
      req.session.menu = normalizarMenu(req.session.menu);
      res.locals.menu = req.session.menu;
      res.locals.permisosNombres = req.session.permisosNombres || [];
    }

    if (!verificarAccesoRuta(req, res)) return;

    next();
  } catch (error) {
    console.error('Error cargando permisos del usuario:', error);
    next(error);
  }
};

/**
 * Middleware: exige una o más opciones del menú por nombre (ej. "Clientes").
 * Debe usarse después de reqAuth.
 */
const checkPermission =
  (...nombresOpcion) =>
  (req, res, next) => {
    const tiene = nombresOpcion.some((nombre) => usuarioTienePermiso(req, nombre));
    if (!tiene) {
      return denegarAcceso(
        req,
        res,
        `No tiene permiso para realizar esta acción (${nombresOpcion.join(' / ')}).`
      );
    }
    next();
  };

function invalidarPermisosSesion(req) {
  delete req.session.menu;
  delete req.session.permisos;
  delete req.session.permisosRutas;
  delete req.session.permisosNombres;
}

const guestOnly = (req, res, next) => {
  if (req.session.usuario) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  reqAuth,
  guestOnly,
  checkPermission,
  cargarPermisosSesion,
  invalidarPermisosSesion,
  usuarioTienePermiso,
  denegarAcceso,
  normalizarRuta,
  buildPermisosRutas,
  tieneAccesoRuta,
};
