CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_password_reset_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);
