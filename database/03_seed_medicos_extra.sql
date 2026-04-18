-- ============================================
-- MEDICONNECT - AMPLIACION OPCION C
-- +10 especialidades nuevas
-- +10 medicos nuevos
-- Compatible con la BD actual en PostgreSQL
-- ============================================

BEGIN;

-- ============================================
-- 1) NUEVAS ESPECIALIDADES
-- ============================================

INSERT INTO especialidades (nombre_especialidad, descripcion, estado)
VALUES
('Oftalmologia', 'Diagnostico y tratamiento de enfermedades oculares', 'activa'),
('Otorrinolaringologia', 'Atencion de oido, nariz y garganta', 'activa'),
('Ginecologia', 'Salud integral de la mujer', 'activa'),
('Neurologia', 'Diagnostico y tratamiento de trastornos del sistema nervioso', 'activa'),
('Medicina Interna', 'Prevencion, diagnostico y tratamiento integral del adulto', 'activa'),
('Urologia', 'Diagnostico y tratamiento del sistema urinario y reproductor masculino', 'activa'),
('Psiquiatria', 'Prevencion y tratamiento de trastornos de salud mental', 'activa'),
('Endocrinologia', 'Atencion de enfermedades hormonales y metabolicas', 'activa'),
('Gastroenterologia', 'Diagnostico y tratamiento del sistema digestivo', 'activa'),
('Medicina Fisica y Rehabilitacion', 'Rehabilitacion funcional y recuperacion fisica', 'activa')
ON CONFLICT (nombre_especialidad) DO NOTHING;

-- ============================================
-- 2) NUEVOS USUARIOS MEDICOS
-- id_rol = 3 -> Medico
-- ============================================

INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES
('Camila', 'Soto', 'medico6@mediconnect.cl', 'hash_medico_006', '951111111', 'activo', 3),
('Felipe', 'Muñoz', 'medico7@mediconnect.cl', 'hash_medico_007', '952222222', 'activo', 3),
('Javiera', 'Contreras', 'medico8@mediconnect.cl', 'hash_medico_008', '953333333', 'activo', 3),
('Matias', 'Herrera', 'medico9@mediconnect.cl', 'hash_medico_009', '954444444', 'activo', 3),
('Francisca', 'Navarro', 'medico10@mediconnect.cl', 'hash_medico_010', '955555555', 'activo', 3),
('Sebastian', 'Araya', 'medico11@mediconnect.cl', 'hash_medico_011', '956666666', 'activo', 3),
('Antonia', 'Castillo', 'medico12@mediconnect.cl', 'hash_medico_012', '957777777', 'activo', 3),
('Tomas', 'Sanhueza', 'medico13@mediconnect.cl', 'hash_medico_013', '958888888', 'activo', 3),
('Daniela', 'Fuenzalida', 'medico14@mediconnect.cl', 'hash_medico_014', '959999999', 'activo', 3),
('Benjamin', 'Loyola', 'medico15@mediconnect.cl', 'hash_medico_015', '960000000', 'activo', 3)
ON CONFLICT (correo) DO NOTHING;

-- ============================================
-- 3) NUEVOS REGISTROS EN MEDICOS
-- ============================================

INSERT INTO medicos (
    id_usuario,
    id_especialidad,
    numero_registro,
    anios_experiencia,
    biografia,
    valoracion_promedio,
    total_valoraciones,
    estado
)
SELECT u.id_usuario, e.id_especialidad, x.numero_registro, x.anios_experiencia,
       x.biografia, x.valoracion_promedio, x.total_valoraciones, 'activo'
FROM (
    VALUES
    ('medico6@mediconnect.cl',  'Oftalmologia',                     'REG-MED-006',  9,  'Oftalmologa especializada en evaluacion visual integral, patologias retinianas y manejo de enfermedades oculares cronicas. Enfoque en prevencion, diagnostico temprano y seguimiento clinico.', 4.8, 124),
    ('medico7@mediconnect.cl',  'Otorrinolaringologia',             'REG-MED-007', 11,  'Otorrinolaringologo con experiencia en patologias de oido, nariz y garganta. Enfoque en sinusitis cronica, amigdalas, audicion y trastornos respiratorios.', 4.7, 138),
    ('medico8@mediconnect.cl',  'Ginecologia',                      'REG-MED-008', 10,  'Ginecologa orientada a control preventivo, salud reproductiva y acompanamiento integral de la mujer en distintas etapas de vida.', 4.9, 176),
    ('medico9@mediconnect.cl',  'Neurologia',                       'REG-MED-009', 14,  'Neurologo dedicado al diagnostico y manejo de cefaleas, epilepsia, neuropatias y trastornos del sistema nervioso central y periferico.', 4.8, 159),
    ('medico10@mediconnect.cl', 'Medicina Interna',                 'REG-MED-010', 13,  'Internista con amplia experiencia en manejo integral del paciente adulto, enfermedades cronicas, hipertension, diabetes y evaluacion clinica compleja.', 4.8, 201),
    ('medico11@mediconnect.cl', 'Urologia',                         'REG-MED-011', 12,  'Urologo con experiencia en patologia prostatica, infecciones urinarias, litiasis renal y salud urinaria del adulto.', 4.6, 117),
    ('medico12@mediconnect.cl', 'Psiquiatria',                      'REG-MED-012', 8,   'Psiquiatra enfocada en trastornos de ansiedad, depresion, adaptacion y acompanamiento farmacologico y terapeutico de adultos.', 4.9, 143),
    ('medico13@mediconnect.cl', 'Endocrinologia',                   'REG-MED-013', 15,  'Endocrinologo especialista en diabetes, obesidad, trastornos tiroideos y alteraciones metabolicas con enfoque preventivo y seguimiento continuo.', 4.7, 189),
    ('medico14@mediconnect.cl', 'Gastroenterologia',                'REG-MED-014', 11,  'Gastroenterologa con experiencia en reflujo, sindrome de intestino irritable, gastritis y enfermedades digestivas cronicas.', 4.8, 131),
    ('medico15@mediconnect.cl', 'Medicina Fisica y Rehabilitacion', 'REG-MED-015', 9,   'Especialista en medicina fisica y rehabilitacion, enfocada en recuperacion funcional, dolor musculoesqueletico y reintegro progresivo de pacientes.', 4.7, 96)
) AS x(correo, especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones)
JOIN usuarios u ON u.correo = x.correo
JOIN especialidades e ON e.nombre_especialidad = x.especialidad
WHERE NOT EXISTS (
    SELECT 1
    FROM medicos m
    WHERE m.numero_registro = x.numero_registro
);

-- ============================================
-- 4) DISPONIBILIDAD BASICA PARA LOS NUEVOS MEDICOS
-- 3 bloques por medico
-- ============================================

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
SELECT m.id_medico, d.fecha::date, d.hora_inicio::time, d.hora_fin::time, 'disponible', d.observacion
FROM medicos m
JOIN usuarios u ON u.id_usuario = m.id_usuario
JOIN (
    VALUES
    ('medico6@mediconnect.cl',  '2026-05-12', '09:00', '09:30', 'Bloque Oftalmologia'),
    ('medico6@mediconnect.cl',  '2026-05-12', '09:30', '10:00', 'Bloque Oftalmologia'),
    ('medico6@mediconnect.cl',  '2026-05-12', '10:00', '10:30', 'Bloque Oftalmologia'),

    ('medico7@mediconnect.cl',  '2026-05-12', '11:00', '11:30', 'Bloque Otorrinolaringologia'),
    ('medico7@mediconnect.cl',  '2026-05-12', '11:30', '12:00', 'Bloque Otorrinolaringologia'),
    ('medico7@mediconnect.cl',  '2026-05-12', '12:00', '12:30', 'Bloque Otorrinolaringologia'),

    ('medico8@mediconnect.cl',  '2026-05-13', '09:00', '09:30', 'Bloque Ginecologia'),
    ('medico8@mediconnect.cl',  '2026-05-13', '09:30', '10:00', 'Bloque Ginecologia'),
    ('medico8@mediconnect.cl',  '2026-05-13', '10:00', '10:30', 'Bloque Ginecologia'),

    ('medico9@mediconnect.cl',  '2026-05-13', '11:00', '11:30', 'Bloque Neurologia'),
    ('medico9@mediconnect.cl',  '2026-05-13', '11:30', '12:00', 'Bloque Neurologia'),
    ('medico9@mediconnect.cl',  '2026-05-13', '12:00', '12:30', 'Bloque Neurologia'),

    ('medico10@mediconnect.cl', '2026-05-14', '09:00', '09:30', 'Bloque Medicina Interna'),
    ('medico10@mediconnect.cl', '2026-05-14', '09:30', '10:00', 'Bloque Medicina Interna'),
    ('medico10@mediconnect.cl', '2026-05-14', '10:00', '10:30', 'Bloque Medicina Interna'),

    ('medico11@mediconnect.cl', '2026-05-14', '11:00', '11:30', 'Bloque Urologia'),
    ('medico11@mediconnect.cl', '2026-05-14', '11:30', '12:00', 'Bloque Urologia'),
    ('medico11@mediconnect.cl', '2026-05-14', '12:00', '12:30', 'Bloque Urologia'),

    ('medico12@mediconnect.cl', '2026-05-15', '09:00', '09:30', 'Bloque Psiquiatria'),
    ('medico12@mediconnect.cl', '2026-05-15', '09:30', '10:00', 'Bloque Psiquiatria'),
    ('medico12@mediconnect.cl', '2026-05-15', '10:00', '10:30', 'Bloque Psiquiatria'),

    ('medico13@mediconnect.cl', '2026-05-15', '11:00', '11:30', 'Bloque Endocrinologia'),
    ('medico13@mediconnect.cl', '2026-05-15', '11:30', '12:00', 'Bloque Endocrinologia'),
    ('medico13@mediconnect.cl', '2026-05-15', '12:00', '12:30', 'Bloque Endocrinologia'),

    ('medico14@mediconnect.cl', '2026-05-18', '09:00', '09:30', 'Bloque Gastroenterologia'),
    ('medico14@mediconnect.cl', '2026-05-18', '09:30', '10:00', 'Bloque Gastroenterologia'),
    ('medico14@mediconnect.cl', '2026-05-18', '10:00', '10:30', 'Bloque Gastroenterologia'),

    ('medico15@mediconnect.cl', '2026-05-18', '11:00', '11:30', 'Bloque Rehabilitacion'),
    ('medico15@mediconnect.cl', '2026-05-18', '11:30', '12:00', 'Bloque Rehabilitacion'),
    ('medico15@mediconnect.cl', '2026-05-18', '12:00', '12:30', 'Bloque Rehabilitacion')
) AS d(correo, fecha, hora_inicio, hora_fin, observacion)
ON u.correo = d.correo
WHERE NOT EXISTS (
    SELECT 1
    FROM disponibilidad_medica dm
    WHERE dm.id_medico = m.id_medico
      AND dm.fecha = d.fecha::date
      AND dm.hora_inicio = d.hora_inicio::time
      AND dm.hora_fin = d.hora_fin::time
);

COMMIT;