const fs = require('fs');
const path = require('path');
const { ExamenLaboratorio, HistorialClinico } = require('../models');

class ExamenLaboratorioController {
  /**
   * POST /historial-clinico/:idHistorial/examenes
   * Guarda un nuevo examen de laboratorio con su archivo adjunto.
   * El middleware uploadExamen.single('archivo') se aplica en la ruta.
   */
  static async store(req, res) {
    const { idHistorial } = req.params;

    try {
      const historial = await HistorialClinico.findOne({ where: { id: idHistorial, estado: 1 } });

      if (!historial) {
        req.flash('error', 'Historial clínico no encontrado.');
        return res.redirect('/historial-clinico');
      }

      const { tipoExamen, descripcion, resultado, fechaExamen } = req.body;

      const archivoRuta = req.file ? req.file.filename : null;
      const archivoNombre = req.file ? req.file.originalname : null;

      await ExamenLaboratorio.create({
        idHistorial: parseInt(idHistorial),
        tipoExamen: tipoExamen.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        resultado: resultado ? resultado.trim() : null,
        fechaExamen: fechaExamen || null,
        archivo: archivoRuta,
        nombreArchivo: archivoNombre,
      });

      req.flash('success', 'Examen de laboratorio registrado correctamente.');
      res.redirect(`/historial-clinico/${idHistorial}`);
    } catch (error) {
      console.error('Error al registrar examen de laboratorio:', error);
      // Si se subió un archivo pero falló el guardado en BD, eliminarlo
      if (req.file) {
        const rutaArchivo = path.join(__dirname, '../../uploads/examenes/', req.file.filename);
        fs.promises.unlink(rutaArchivo).catch((unlinkErr) => {
          console.error('Error al eliminar archivo huérfano:', unlinkErr);
        });
      }
      req.flash('error', 'Error al registrar el examen de laboratorio. Intente nuevamente.');
      res.redirect(`/historial-clinico/${idHistorial}`);
    }
  }

  /**
   * GET /examenes-laboratorio/:id/descargar
   * Descarga el archivo adjunto de un examen. Requiere autenticación (manejada en la ruta).
   */
  static async descargar(req, res) {
    try {
      const { id } = req.params;

      const examen = await ExamenLaboratorio.findByPk(id);

      if (!examen) {
        req.flash('error', 'Examen de laboratorio no encontrado.');
        return res.redirect('back');
      }

      if (!examen.archivo) {
        req.flash('error', 'Este examen no tiene archivo adjunto.');
        return res.redirect('back');
      }

      const rutaArchivo = path.join(__dirname, '../../uploads/examenes/', examen.archivo);

      // Verificar que el archivo existe en el filesystem
      try {
        await fs.promises.access(rutaArchivo, fs.constants.F_OK);
      } catch {
        req.flash('error', 'El archivo no se encuentra disponible.');
        return res.redirect('back');
      }

      // Usar el nombre original para la descarga
      const nombreDescarga = examen.nombreArchivo || examen.archivo;
      res.download(rutaArchivo, nombreDescarga);
    } catch (error) {
      console.error('Error al descargar examen de laboratorio:', error);
      req.flash('error', 'Error al descargar el archivo. Intente nuevamente.');
      res.redirect('back');
    }
  }

  /**
   * DELETE /examenes-laboratorio/:id
   * Elimina el examen de laboratorio: primero el archivo del filesystem, luego el registro de BD.
   */
  static async destroy(req, res) {
    const { id } = req.params;
    let idHistorial = null;

    try {
      const examen = await ExamenLaboratorio.findByPk(id);

      if (!examen) {
        req.flash('error', 'Examen de laboratorio no encontrado.');
        return res.redirect('back');
      }

      idHistorial = examen.idHistorial;

      // Eliminar archivo del filesystem si existe
      if (examen.archivo) {
        const rutaArchivo = path.join(__dirname, '../../uploads/examenes/', examen.archivo);
        try {
          await fs.promises.unlink(rutaArchivo);
        } catch (unlinkErr) {
          if (unlinkErr.code !== 'ENOENT') {
            // Solo lanzar error si no es "archivo no encontrado"
            console.error('Error al eliminar archivo del examen:', unlinkErr);
          }
          // Si el archivo no existe (ENOENT), continuamos con la eliminación del registro
        }
      }

      // Eliminar registro de la BD
      await examen.destroy();

      req.flash('success', 'Examen de laboratorio eliminado correctamente.');
      res.redirect(`/historial-clinico/${idHistorial}`);
    } catch (error) {
      console.error('Error al eliminar examen de laboratorio:', error);
      req.flash('error', 'Error al eliminar el examen de laboratorio. Intente nuevamente.');
      if (idHistorial) {
        res.redirect(`/historial-clinico/${idHistorial}`);
      } else {
        res.redirect('back');
      }
    }
  }
}

module.exports = ExamenLaboratorioController;
