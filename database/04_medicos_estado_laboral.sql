-- =========================================================
-- MIGRACIÓN 04: estado_laboral en la tabla medicos
-- Fecha: 2026-05-03
-- Aplicar sobre una BD existente con 01_init.sql ya ejecutado.
-- =========================================================

-- 1. Agregar columna estado_laboral con sus valores permitidos
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS estado_laboral VARCHAR(30) DEFAULT 'activo' NOT NULL;

ALTER TABLE medicos
  DROP CONSTRAINT IF EXISTS chk_medicos_estado_laboral;

ALTER TABLE medicos
  ADD CONSTRAINT chk_medicos_estado_laboral
    CHECK (estado_laboral IN (
      'activo',
      'vacaciones',
      'licencia_medica',
      'licencia_administrativa',
      'inactivo',
      'destituido'
    ));

-- 2. Actualizar registros existentes con valor coherente
UPDATE medicos SET estado_laboral = 'activo'   WHERE estado = 'activo';
UPDATE medicos SET estado_laboral = 'inactivo' WHERE estado = 'inactivo';
