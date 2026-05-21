require('dotenv').config();
const sequelize = require('../src/config/database');

(async () => {
  try {
    const [rows] = await sequelize.query(
      "UPDATE opciones SET ruta = '/banos/listar' WHERE id = 19 OR ruta = '/baños/listar' RETURNING id, nombre, ruta"
    );
    console.log('Opciones actualizadas:', rows);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
