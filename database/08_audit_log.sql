-- Auditoria basica de acciones administrativas.
-- Mantiene una sola tabla consultable desde /admin/auditoria.

CREATE TABLE IF NOT EXISTS audit_log (
    id_audit_log BIGSERIAL PRIMARY KEY,
    id_usuario_admin INTEGER NOT NULL,
    nombre_usuario_admin VARCHAR(200) NOT NULL,
    email_usuario_admin VARCHAR(150) NOT NULL,
    tipo_accion VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id INTEGER,
    ip_origen VARCHAR(45),
    user_agent VARCHAR(500),
    endpoint_api VARCHAR(200),
    metodo_http VARCHAR(10),
    codigo_respuesta INTEGER,
    fecha_evento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    duracion_ms INTEGER,
    estado VARCHAR(20) DEFAULT 'completado' NOT NULL,
    mensaje_error VARCHAR(500),
    CONSTRAINT chk_audit_tipo_accion CHECK (tipo_accion IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'VIEW')),
    CONSTRAINT chk_audit_categoria CHECK (categoria IN ('MEDICO', 'ESPECIALIDAD', 'PACIENTE', 'CITA', 'SOLICITUD', 'DISPONIBILIDAD', 'PERFIL_ADMIN', 'SEGURIDAD')),
    CONSTRAINT chk_audit_estado CHECK (estado IN ('completado', 'error', 'rechazado')),
    CONSTRAINT fk_audit_log_usuario FOREIGN KEY (id_usuario_admin)
        REFERENCES usuarios(id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_fecha
    ON audit_log(fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario
    ON audit_log(id_usuario_admin, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_categoria
    ON audit_log(categoria, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_accion
    ON audit_log(tipo_accion, fecha_evento DESC);
