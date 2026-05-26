-- Migración: agregar columna duracion_minutos a la tabla servicios
-- Ejecutar en Supabase SQL Editor

ALTER TABLE servicios
ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT NULL;
