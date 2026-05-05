-- =========================================================
-- TABLA PARA TOKENS DE RESET DE CONTRASEÑA
-- =========================================================

CREATE TABLE password_reset_tokens (
    id_token INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL, -- Hash del token para seguridad
    usado BOOLEAN DEFAULT FALSE NOT NULL,
    expiracion TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_reset_tokens_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- Un índice único parcial permite un solo token activo por usuario
CREATE UNIQUE INDEX IF NOT EXISTS uq_reset_tokens_usuario_activo
    ON password_reset_tokens (id_usuario)
    WHERE usado = FALSE;

-- Índice para búsquedas eficientes por token
CREATE INDEX idx_reset_tokens_hash ON password_reset_tokens(token_hash) WHERE usado = FALSE;

-- Índice para limpieza automática de tokens expirados
CREATE INDEX idx_reset_tokens_expiracion ON password_reset_tokens(expiracion) WHERE usado = FALSE;

-- Función para limpiar tokens expirados automáticamente
CREATE OR REPLACE FUNCTION limpiar_tokens_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expiracion < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar limpieza automática (opcional)
-- Se puede llamar manualmente o programar con pg_cron si está disponible