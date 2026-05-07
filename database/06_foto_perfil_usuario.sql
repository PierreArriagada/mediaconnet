-- =========================================================
-- MediConnect
-- Agrega soporte de foto de perfil para usuarios/médicos
-- =========================================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;