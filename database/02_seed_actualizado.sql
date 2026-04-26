-- =========================================================
-- SEED ACTUALIZADO — MediConnect
-- Fecha base: 18-04-2026
-- Agrega 3 médicos nuevos, disponibilidad real para las
-- próximas 3 semanas y citas de ejemplo.
-- =========================================================

-- ── 1. Nuevos usuarios médicos ────────────────────────────
INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES
  ('Andrés',   'Morales',  'medico3@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '956789012', 'activo', 3),
  ('Patricia', 'Fuentes',  'medico4@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '967890123', 'activo', 3),
  ('Roberto',  'Vega',     'medico5@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '978901234', 'activo', 3)
ON CONFLICT (correo) DO NOTHING;

-- Segundo paciente con cuenta propia para pruebas adicionales
INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES ('Camila', 'Torres', 'paciente2@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '911223344', 'activo', 2)
ON CONFLICT (correo) DO NOTHING;

-- ── 2. Nuevos médicos ─────────────────────────────────────
-- Pediatría (id_especialidad=2)
INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones, estado)
SELECT u.id_usuario, 2, 'REG-MED-003', 15,
  'Pediatra dedicado al cuidado integral de ninos y adolescentes. Experto en control de crecimiento, vacunacion y enfermedades respiratorias infantiles.',
  4.7, 215, 'activo'
FROM usuarios u WHERE u.correo = 'medico3@mediconnect.cl'
ON CONFLICT (numero_registro) DO NOTHING;

-- Traumatología (id_especialidad=4)
INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones, estado)
SELECT u.id_usuario, 4, 'REG-MED-004', 8,
  'Traumatologa con enfoque en lesiones deportivas, fracturas y rehabilitacion musculoesqueletica. Experiencia en tratamiento conservador y quirurgico.',
  4.6, 76, 'activo'
FROM usuarios u WHERE u.correo = 'medico4@mediconnect.cl'
ON CONFLICT (numero_registro) DO NOTHING;

-- Cardiología (id_especialidad=5)
INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones, estado)
SELECT u.id_usuario, 5, 'REG-MED-005', 20,
  'Cardiologo con mas de 20 anos de experiencia en prevencion cardiovascular, hipertension y arritmias. Especialista en ecocardiografia y pruebas de esfuerzo.',
  4.9, 310, 'activo'
FROM usuarios u WHERE u.correo = 'medico5@mediconnect.cl'
ON CONFLICT (numero_registro) DO NOTHING;

-- Paciente 2 ligado a su usuario
INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento, direccion, comuna, ciudad, contacto_emergencia, telefono_emergencia)
SELECT u.id_usuario, '19234567-8', DATE '1994-03-22', 'Paseo Giordano 890', 'Viña del Mar', 'Valparaíso', 'Luis Torres', '944332211'
FROM usuarios u WHERE u.correo = 'paciente2@mediconnect.cl'
ON CONFLICT (rut) DO NOTHING;

-- ── 3. Disponibilidad Dr. Carlos Rojas (id_medico=1) ──────
-- Medicina General: Lun-Vie, bloques de mañana 09:00-12:30
INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT
  1,
  d::date,
  t.hi::time,
  t.hf::time,
  'disponible'
FROM generate_series('2026-04-20'::date, '2026-05-08'::date, '1 day'::interval) d
CROSS JOIN (VALUES
  ('09:00','09:30'),
  ('09:30','10:00'),
  ('10:00','10:30'),
  ('10:30','11:00'),
  ('11:00','11:30'),
  ('11:30','12:00'),
  ('12:00','12:30')
) t(hi, hf)
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT ON CONSTRAINT uq_disponibilidad DO NOTHING;

-- ── 4. Disponibilidad Dra. Valentina Perez (id_medico=2) ──
-- Dermatología: Lun-Vie, bloques de tarde 14:00-17:00
INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT
  2,
  d::date,
  t.hi::time,
  t.hf::time,
  'disponible'
FROM generate_series('2026-04-20'::date, '2026-05-08'::date, '1 day'::interval) d
CROSS JOIN (VALUES
  ('14:00','14:30'),
  ('14:30','15:00'),
  ('15:00','15:30'),
  ('15:30','16:00'),
  ('16:00','16:30'),
  ('16:30','17:00')
) t(hi, hf)
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT ON CONSTRAINT uq_disponibilidad DO NOTHING;

-- ── 5. Disponibilidad Dr. Andrés Morales (Pediatría) ──────
-- Martes y Jueves, bloques de mañana 09:00-12:00
INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT
  m.id_medico,
  d::date,
  t.hi::time,
  t.hf::time,
  'disponible'
FROM medicos m
CROSS JOIN generate_series('2026-04-20'::date, '2026-05-08'::date, '1 day'::interval) d
CROSS JOIN (VALUES
  ('09:00','09:30'),
  ('09:30','10:00'),
  ('10:00','10:30'),
  ('10:30','11:00'),
  ('11:00','11:30'),
  ('11:30','12:00')
) t(hi, hf)
WHERE m.numero_registro = 'REG-MED-003'
  AND EXTRACT(DOW FROM d) IN (2, 4)
ON CONFLICT ON CONSTRAINT uq_disponibilidad DO NOTHING;

-- ── 6. Disponibilidad Dra. Patricia Fuentes (Traumatología) ──
-- Lunes, Miércoles y Viernes, bloques 10:00-13:00
INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT
  m.id_medico,
  d::date,
  t.hi::time,
  t.hf::time,
  'disponible'
FROM medicos m
CROSS JOIN generate_series('2026-04-20'::date, '2026-05-08'::date, '1 day'::interval) d
CROSS JOIN (VALUES
  ('10:00','10:30'),
  ('10:30','11:00'),
  ('11:00','11:30'),
  ('11:30','12:00'),
  ('12:00','12:30'),
  ('12:30','13:00')
) t(hi, hf)
WHERE m.numero_registro = 'REG-MED-004'
  AND EXTRACT(DOW FROM d) IN (1, 3, 5)
ON CONFLICT ON CONSTRAINT uq_disponibilidad DO NOTHING;

-- ── 7. Disponibilidad Dr. Roberto Vega (Cardiología) ──────
-- Miércoles y Viernes, bloques de tarde 15:00-18:00
INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT
  m.id_medico,
  d::date,
  t.hi::time,
  t.hf::time,
  'disponible'
FROM medicos m
CROSS JOIN generate_series('2026-04-20'::date, '2026-05-08'::date, '1 day'::interval) d
CROSS JOIN (VALUES
  ('15:00','15:30'),
  ('15:30','16:00'),
  ('16:00','16:30'),
  ('16:30','17:00'),
  ('17:00','17:30'),
  ('17:30','18:00')
) t(hi, hf)
WHERE m.numero_registro = 'REG-MED-005'
  AND EXTRACT(DOW FROM d) IN (3, 5)
ON CONFLICT ON CONSTRAINT uq_disponibilidad DO NOTHING;

-- ── 8. Citas futuras de ejemplo para Laura (id_paciente=1) ──
-- Cita confirmada: Lunes 20-Abr con Dr. Rojas (09:30)
WITH slot AS (
  UPDATE disponibilidad_medica
  SET estado = 'reservada'
  WHERE id_medico = 1 AND fecha = '2026-04-21' AND hora_inicio = '09:00' AND estado = 'disponible'
  RETURNING id_disponibilidad, fecha, hora_inicio
)
INSERT INTO citas_medicas (
  id_paciente, id_medico, id_especialidad, id_disponibilidad,
  modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta, es_invitado
)
SELECT 1, 1, 1, s.id_disponibilidad, 'presencial', s.fecha, s.hora_inicio, 'confirmada', 'Control de presión arterial', FALSE
FROM slot s;

-- Cita pendiente: Miércoles 22-Abr con Dra. Perez (14:00)
WITH slot AS (
  UPDATE disponibilidad_medica
  SET estado = 'reservada'
  WHERE id_medico = 2 AND fecha = '2026-04-23' AND hora_inicio = '14:00' AND estado = 'disponible'
  RETURNING id_disponibilidad, fecha, hora_inicio
)
INSERT INTO citas_medicas (
  id_paciente, id_medico, id_especialidad, id_disponibilidad,
  modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta, es_invitado
)
SELECT 1, 2, 3, s.id_disponibilidad, 'presencial', s.fecha, s.hora_inicio, 'pendiente', 'Revisión de manchas en la piel', FALSE
FROM slot s;

-- Cita pendiente: Jueves 24-Abr con Dr. Morales Pediatría (10:00)
WITH slot AS (
  UPDATE disponibilidad_medica
  SET estado = 'reservada'
  WHERE id_medico = (SELECT id_medico FROM medicos WHERE numero_registro = 'REG-MED-003')
    AND fecha = '2026-04-24' AND hora_inicio = '10:00' AND estado = 'disponible'
  RETURNING id_disponibilidad, fecha, hora_inicio, id_medico
)
INSERT INTO citas_medicas (
  id_paciente, id_medico, id_especialidad, id_disponibilidad,
  modalidad, fecha_cita, hora_cita, estado_cita, motivo_consulta, es_invitado
)
SELECT 1, s.id_medico, 2, s.id_disponibilidad, 'telemedicina', s.fecha, s.hora_inicio, 'pendiente', 'Consulta por tos persistente en menor', FALSE
FROM slot s;

-- ── 9. Notificaciones actualizadas para Laura ─────────────
INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
VALUES
  (2, 'Cita confirmada',      'Tu cita con el Dr. Rojas el 21-04-2026 a las 09:00 fue confirmada.', 'confirmacion', FALSE),
  (2, 'Recordatorio de cita', 'Tienes una cita con la Dra. Pérez mañana 23-04-2026 a las 14:00.',  'recordatorio',  FALSE),
  (2, 'Horarios disponibles', 'El Dr. Vega (Cardiología) tiene nuevos horarios disponibles esta semana.', 'general', FALSE);

-- ── 10. Verificación de datos insertados ─────────────────
SELECT 'Médicos activos' AS info, COUNT(*) AS total FROM medicos WHERE estado = 'activo';
SELECT 'Disponibilidad futura' AS info, COUNT(*) AS total FROM disponibilidad_medica WHERE fecha >= CURRENT_DATE AND estado = 'disponible';
SELECT 'Citas médicas total' AS info, COUNT(*) AS total FROM citas_medicas;
SELECT 'Notificaciones no leídas (paciente1)' AS info, COUNT(*) AS total FROM notificaciones WHERE id_usuario = 2 AND leida = FALSE;
