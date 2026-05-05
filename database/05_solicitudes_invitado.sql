-- =========================================================
-- MIGRACIÓN 05: fecha_limite_asignacion en citas_medicas
-- Fecha: 2026-05-03
-- Aplicar sobre una BD existente con 01_init.sql ya ejecutado.
-- Propósito: soportar el flujo de solicitudes de invitado con
--   auto-asignación automática si el admin no actúa en 2 horas.
-- =========================================================

-- 1. Añadir columna para plazo de auto-asignación
ALTER TABLE citas_medicas
  ADD COLUMN IF NOT EXISTS fecha_limite_asignacion TIMESTAMPTZ DEFAULT NULL;

-- 2. Índice parcial para que el job de auto-asignación sea eficiente
CREATE INDEX IF NOT EXISTS idx_citas_limite_asignacion
  ON citas_medicas(fecha_limite_asignacion)
  WHERE fecha_limite_asignacion IS NOT NULL AND estado_cita = 'pendiente';
