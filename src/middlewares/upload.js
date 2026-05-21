const multer = require('multer');
const path = require('path');

// ─── Generador de nombre único ────────────────────────────────────────────────
const generarNombreUnico = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `${timestamp}-${random}${ext}`;
};

// ─── Storage: Fotos de mascotas ───────────────────────────────────────────────
const storageFotos = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/fotos'));
  },
  filename: (req, file, cb) => {
    cb(null, generarNombreUnico(file));
  },
});

// ─── Storage: Exámenes de laboratorio ────────────────────────────────────────
const storageExamenes = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/examenes'));
  },
  filename: (req, file, cb) => {
    cb(null, generarNombreUnico(file));
  },
});

// ─── Filtro de archivos: Fotos (solo imágenes) ────────────────────────────────
const filtroFotos = (req, file, cb) => {
  const extensionesPermitidas = /\.(jpg|jpeg|png)$/i;
  const mimeTypesPermitidos = /^image\/(jpeg|png)$/;

  const extValida = extensionesPermitidas.test(path.extname(file.originalname));
  const mimeValido = mimeTypesPermitidos.test(file.mimetype);

  if (extValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes JPG, JPEG o PNG.'), false);
  }
};

// ─── Filtro de archivos: Exámenes (PDF e imágenes) ───────────────────────────
const filtroExamenes = (req, file, cb) => {
  const extensionesPermitidas = /\.(pdf|jpg|jpeg|png)$/i;
  const mimeTypesPermitidos = /^(application\/pdf|image\/(jpeg|png))$/;

  const extValida = extensionesPermitidas.test(path.extname(file.originalname));
  const mimeValido = mimeTypesPermitidos.test(file.mimetype);

  if (extValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan archivos PDF, JPG, JPEG o PNG.'), false);
  }
};

// ─── Instancias de multer ─────────────────────────────────────────────────────
const uploadFoto = multer({
  storage: storageFotos,
  fileFilter: filtroFotos,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

const uploadExamen = multer({
  storage: storageExamenes,
  fileFilter: filtroExamenes,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ─── Manejador de errores de multer ──────────────────────────────────────────
/**
 * Middleware para capturar y formatear errores de multer.
 * Úsalo después de uploadFoto o uploadExamen en las rutas.
 *
 * Ejemplo de uso en una ruta:
 *   router.post('/api/guardar', reqAuth, uploadFoto.single('foto'), handleUploadError, MascotaController.guardar);
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo supera el tamaño máximo permitido.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error al subir el archivo: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = { uploadFoto, uploadExamen, handleUploadError };
