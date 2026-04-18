-- =========================================================
-- PROYECTO: MediConnect
-- SCRIPT INICIAL DE BASE DE DATOS
-- MOTOR: PostgreSQL 18
-- BASE DE DATOS: mediconnect
-- Migrado desde Oracle 21c XE.
-- Script de referencia Oracle: database/MediConnect_Oracle_Reference.sql
-- =========================================================

-- =========================================================
-- EXTENSIONES REQUERIDAS
-- pgcrypto: necesario para hashear contraseñas con bcrypt (blowfish)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- LIMPIEZA PREVIA (opcional)
-- Ejecutar solo si quieres reiniciar desde cero.
-- =========================================================

DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS historial_atenciones CASCADE;
DROP TABLE IF EXISTS citas_medicas CASCADE;
DROP TABLE IF EXISTS disponibilidad_medica CASCADE;
DROP TABLE IF EXISTS medicos CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS especialidades CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =========================================================
-- TABLAS MAESTRAS
-- =========================================================

CREATE TABLE roles (
    id_rol INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre_rol)
);

CREATE TABLE usuarios (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'activo' NOT NULL,
    id_rol INTEGER NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT chk_usuarios_estado CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol) ON DELETE RESTRICT
);

CREATE TABLE especialidades (
    id_especialidad INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_especialidad VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'activa' NOT NULL,
    CONSTRAINT uq_especialidades_nombre UNIQUE (nombre_especialidad),
    CONSTRAINT chk_especialidades_estado CHECK (estado IN ('activa', 'inactiva'))
);

-- =========================================================
-- TABLAS DE NEGOCIO
-- =========================================================

CREATE TABLE pacientes (
    id_paciente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INTEGER,
    rut VARCHAR(12) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    direccion VARCHAR(255),
    comuna VARCHAR(100),
    ciudad VARCHAR(100),
    contacto_emergencia VARCHAR(120),
    telefono_emergencia VARCHAR(20),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_pacientes_rut UNIQUE (rut),
    CONSTRAINT fk_pacientes_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE medicos (
    id_medico INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_especialidad INTEGER NOT NULL,
    numero_registro VARCHAR(50) NOT NULL,
    anios_experiencia INTEGER DEFAULT 0 NOT NULL,
    biografia VARCHAR(500),
    valoracion_promedio NUMERIC(2,1) DEFAULT 0.0,
    total_valoraciones INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activo' NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_medicos_numero_registro UNIQUE (numero_registro),
    CONSTRAINT chk_medicos_experiencia CHECK (anios_experiencia >= 0),
    CONSTRAINT chk_medicos_estado CHECK (estado IN ('activo', 'inactivo')),
    CONSTRAINT fk_medicos_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_medicos_especialidades FOREIGN KEY (id_especialidad)
        REFERENCES especialidades(id_especialidad) ON DELETE RESTRICT
);

CREATE TABLE disponibilidad_medica (
    id_disponibilidad INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_medico INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'disponible' NOT NULL,
    observacion VARCHAR(255),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_disponibilidad_estado CHECK (estado IN ('disponible', 'reservada', 'bloqueada')),
    CONSTRAINT uq_disponibilidad UNIQUE (id_medico, fecha, hora_inicio, hora_fin),
    CONSTRAINT fk_disponibilidad_medico FOREIGN KEY (id_medico)
        REFERENCES medicos(id_medico) ON DELETE CASCADE
);

CREATE TABLE citas_medicas (
    id_cita INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente INTEGER NOT NULL,
    id_medico INTEGER NOT NULL,
    id_especialidad INTEGER NOT NULL,
    id_disponibilidad INTEGER,
    modalidad VARCHAR(20) DEFAULT 'presencial' NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    estado_cita VARCHAR(20) DEFAULT 'pendiente' NOT NULL,
    motivo_consulta VARCHAR(255) NOT NULL,
    observaciones VARCHAR(255),
    es_invitado BOOLEAN DEFAULT FALSE NOT NULL,
    nombre_invitado VARCHAR(100),
    apellido_invitado VARCHAR(100),
    correo_invitado VARCHAR(150),
    telefono_invitado VARCHAR(20),
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_citas_modalidad CHECK (modalidad IN ('presencial', 'telemedicina')),
    CONSTRAINT chk_citas_estado CHECK (estado_cita IN ('pendiente', 'confirmada', 'cancelada', 'reprogramada', 'completada')),
    CONSTRAINT fk_citas_pacientes FOREIGN KEY (id_paciente)
        REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_citas_medicos FOREIGN KEY (id_medico)
        REFERENCES medicos(id_medico) ON DELETE RESTRICT,
    CONSTRAINT fk_citas_especialidades FOREIGN KEY (id_especialidad)
        REFERENCES especialidades(id_especialidad) ON DELETE RESTRICT,
    CONSTRAINT fk_citas_disponibilidad FOREIGN KEY (id_disponibilidad)
        REFERENCES disponibilidad_medica(id_disponibilidad) ON DELETE SET NULL
);

CREATE TABLE historial_atenciones (
    id_historial INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INTEGER NOT NULL,
    diagnostico TEXT,
    tratamiento TEXT,
    observaciones TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_historial_cita UNIQUE (id_cita),
    CONSTRAINT fk_historial_citas FOREIGN KEY (id_cita)
        REFERENCES citas_medicas(id_cita) ON DELETE CASCADE
);

CREATE TABLE notificaciones (
    id_notificacion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    mensaje VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'general' NOT NULL,
    leida BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_notificaciones_tipo CHECK (tipo IN ('recordatorio', 'confirmacion', 'cancelacion', 'reprogramacion', 'general')),
    CONSTRAINT fk_notificaciones_usuarios FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_medicos_especialidad ON medicos(id_especialidad);
CREATE INDEX idx_disponibilidad_fecha ON disponibilidad_medica(fecha);
CREATE INDEX idx_disponibilidad_medico_fecha ON disponibilidad_medica(id_medico, fecha);
CREATE INDEX idx_citas_fecha ON citas_medicas(fecha_cita);
CREATE INDEX idx_citas_estado ON citas_medicas(estado_cita);
CREATE INDEX idx_citas_paciente ON citas_medicas(id_paciente);
CREATE INDEX idx_citas_medico ON citas_medicas(id_medico);
CREATE INDEX idx_notificaciones_usuario_leida ON notificaciones(id_usuario, leida);

-- =========================================================
-- FUNCIONES Y TRIGGERS PARA ACTUALIZAR fecha_actualizacion
-- En PostgreSQL los triggers requieren una función separada.
-- =========================================================

CREATE OR REPLACE FUNCTION fn_actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_fecha_actualizacion
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_actualizacion();

CREATE TRIGGER trg_pacientes_fecha_actualizacion
    BEFORE UPDATE ON pacientes
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_actualizacion();

CREATE TRIGGER trg_medicos_fecha_actualizacion
    BEFORE UPDATE ON medicos
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_actualizacion();

CREATE TRIGGER trg_citas_fecha_actualizacion
    BEFORE UPDATE ON citas_medicas
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_actualizacion();

-- =========================================================
-- DATOS INICIALES (seed)
-- =========================================================

INSERT INTO roles (nombre_rol, descripcion) VALUES ('Administrador', 'Gestiona usuarios, medicos y parametros del sistema');
INSERT INTO roles (nombre_rol, descripcion) VALUES ('Paciente', 'Solicita y administra horas medicas');
INSERT INTO roles (nombre_rol, descripcion) VALUES ('Medico', 'Gestiona agenda y atiende pacientes');

INSERT INTO especialidades (nombre_especialidad, descripcion, estado) VALUES ('Medicina General', 'Atencion medica general', 'activa');
INSERT INTO especialidades (nombre_especialidad, descripcion, estado) VALUES ('Pediatria', 'Atencion medica infantil', 'activa');
INSERT INTO especialidades (nombre_especialidad, descripcion, estado) VALUES ('Dermatologia', 'Atencion de piel', 'activa');
INSERT INTO especialidades (nombre_especialidad, descripcion, estado) VALUES ('Traumatologia', 'Atencion osteomuscular', 'activa');
INSERT INTO especialidades (nombre_especialidad, descripcion, estado) VALUES ('Cardiologia', 'Atencion cardiologica', 'activa');

-- Contraseña de todos los usuarios semilla: mediconnect2026
-- Hash generado con bcrypt (blowfish, 12 rondas) vía pgcrypto
INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES ('Eduardo', 'Guerrero', 'admin@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '912345678', 'activo', 1);

INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES ('Laura', 'Mora', 'paciente1@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '923456789', 'activo', 2);

INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES ('Carlos', 'Rojas', 'medico1@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '934567890', 'activo', 3);

INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, telefono, estado, id_rol)
VALUES ('Valentina', 'Perez', 'medico2@mediconnect.cl', crypt('mediconnect2026', gen_salt('bf', 12)), '945678901', 'activo', 3);

INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento, direccion, comuna, ciudad, contacto_emergencia, telefono_emergencia)
VALUES (2, '18765432-1', DATE '1999-08-15', 'Av. Central 123', 'Valparaiso', 'Valparaiso', 'Maria Mora', '998887776');

INSERT INTO pacientes (id_usuario, rut, fecha_nacimiento, direccion, comuna, ciudad, contacto_emergencia, telefono_emergencia)
VALUES (NULL, '20111222-3', DATE '2001-05-20', 'Pasaje Norte 456', 'Concon', 'Valparaiso', 'Juan Soto', '977665544');

INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones, estado)
VALUES (3, 1, 'REG-MED-001', 10, 'Medico con amplia experiencia en atencion primaria y enfermedades cronicas. Especialista en diagnostico preventivo y seguimiento integral del paciente adulto.', 4.8, 142, 'activo');

INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, anios_experiencia, biografia, valoracion_promedio, total_valoraciones, estado)
VALUES (4, 3, 'REG-MED-002', 7, 'Dermatologa especializada en tratamientos de acne, dermatitis y lesiones cutaneas. Enfoque en dermatologia estetica y procedimientos minimamente invasivos.', 4.9, 98, 'activo');

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
VALUES (1, DATE '2026-04-15', '09:00', '09:30', 'disponible', 'Bloque manana');

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
VALUES (1, DATE '2026-04-15', '09:30', '10:00', 'disponible', 'Bloque manana');

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
VALUES (1, DATE '2026-04-15', '10:00', '10:30', 'disponible', 'Bloque manana');

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
VALUES (2, DATE '2026-04-16', '11:00', '11:30', 'disponible', 'Bloque dermatologia');

INSERT INTO disponibilidad_medica (id_medico, fecha, hora_inicio, hora_fin, estado, observacion)
VALUES (2, DATE '2026-04-16', '11:30', '12:00', 'disponible', 'Bloque dermatologia');

INSERT INTO citas_medicas (
    id_paciente, id_medico, id_especialidad, id_disponibilidad, modalidad,
    fecha_cita, hora_cita, estado_cita, motivo_consulta, observaciones,
    es_invitado, nombre_invitado, apellido_invitado, correo_invitado, telefono_invitado
) VALUES (
    1, 1, 1, 1, 'presencial',
    DATE '2026-04-15', '09:00', 'confirmada', 'Dolor de cabeza persistente', 'Paciente con sintomas de 3 dias',
    FALSE, NULL, NULL, NULL, NULL
);

INSERT INTO citas_medicas (
    id_paciente, id_medico, id_especialidad, id_disponibilidad, modalidad,
    fecha_cita, hora_cita, estado_cita, motivo_consulta, observaciones,
    es_invitado, nombre_invitado, apellido_invitado, correo_invitado, telefono_invitado
) VALUES (
    2, 2, 3, 4, 'presencial',
    DATE '2026-04-16', '11:00', 'pendiente', 'Consulta por irritacion cutanea', 'Primera evaluacion dermatologica',
    TRUE, 'Ana', 'Soto', 'ana.soto@mail.com', '966554433'
);

INSERT INTO historial_atenciones (id_cita, diagnostico, tratamiento, observaciones)
VALUES (
    1,
    'Migrana tensional',
    'Analgesicos y reposo',
    'Control en 7 dias si persisten sintomas'
);

INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
VALUES (2, 'Recordatorio de cita', 'Tienes una cita medica el 15-04-2026 a las 09:00 hrs.', 'recordatorio', FALSE);

INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
VALUES (2, 'Confirmacion de atencion', 'Tu hora medica fue registrada correctamente.', 'confirmacion', TRUE);

INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida)
VALUES (1, 'Nuevo usuario invitado', 'Se registro una solicitud de hora de un usuario invitado.', 'general', FALSE);

-- =========================================================
-- CONSULTAS DE VALIDACION
-- Estas consultas verifican que la inicialización fue correcta.
-- Se ejecutan al final del script y sus resultados aparecen en
-- los logs de Docker: docker logs mediconnect-postgres
-- =========================================================

-- Verificar usuarios y roles
SELECT u.id_usuario, u.nombre, u.apellido, u.correo, r.nombre_rol
FROM usuarios u
JOIN roles r ON u.id_rol = r.id_rol
ORDER BY u.id_usuario;

-- Verificar médicos y especialidades
SELECT m.id_medico, u.nombre, u.apellido, e.nombre_especialidad, m.numero_registro
FROM medicos m
JOIN usuarios u ON m.id_usuario = u.id_usuario
JOIN especialidades e ON m.id_especialidad = e.id_especialidad
ORDER BY m.id_medico;

-- Verificar disponibilidad médica
SELECT d.id_disponibilidad, d.fecha, d.hora_inicio, d.hora_fin, d.estado,
       u.nombre AS nombre_medico, u.apellido AS apellido_medico
FROM disponibilidad_medica d
JOIN medicos m ON d.id_medico = m.id_medico
JOIN usuarios u ON m.id_usuario = u.id_usuario
ORDER BY d.fecha, d.hora_inicio;

-- Verificar citas médicas
SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado_cita, c.motivo_consulta,
       p.rut,
       um.nombre AS medico_nombre, um.apellido AS medico_apellido,
       e.nombre_especialidad
FROM citas_medicas c
JOIN pacientes p ON c.id_paciente = p.id_paciente
JOIN medicos m ON c.id_medico = m.id_medico
JOIN usuarios um ON m.id_usuario = um.id_usuario
JOIN especialidades e ON c.id_especialidad = e.id_especialidad
ORDER BY c.fecha_cita, c.hora_cita;

-- Verificar historial de atenciones
SELECT h.id_historial, h.fecha_registro, h.diagnostico, h.tratamiento,
       c.id_cita, c.fecha_cita, c.hora_cita
FROM historial_atenciones h
JOIN citas_medicas c ON h.id_cita = c.id_cita
ORDER BY h.id_historial;

-- Verificar notificaciones
SELECT n.id_notificacion, n.titulo, n.mensaje, n.tipo, n.leida, n.fecha_envio,
       u.correo
FROM notificaciones n
JOIN usuarios u ON n.id_usuario = u.id_usuario
ORDER BY n.fecha_envio DESC;