-- Agrega columnas faltantes en categorias_productos (requeridas por Sequelize)
ALTER TABLE categorias_productos ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255);
ALTER TABLE categorias_productos ADD COLUMN IF NOT EXISTS estado INT NOT NULL DEFAULT 1;
