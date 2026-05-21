require('dotenv').config();
const sequelize = require('../src/config/database');

(async () => {
  try {
    const [rows] = await sequelize.query(
      "UPDATE opciones SET ruta = '/reportes/listar' WHERE id = 11 OR ruta LIKE '%reportes%' RETURNING id, nombre, ruta"
    );
    console.log('Opciones actualizadas:', rows);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
