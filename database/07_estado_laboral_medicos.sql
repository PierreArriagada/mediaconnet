-- =========================================================
-- MediConnect
-- Agrega estado laboral para gestión administrativa de médicos
-- =========================================================

ALTER TABLE medicos
ADD COLUMN IF NOT EXISTS estado_laboral VARCHAR(30) NOT NULL DEFAULT 'activo';

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
