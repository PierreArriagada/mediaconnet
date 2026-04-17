/**
 * Middleware global de manejo de errores.
 * Captura cualquier error no controlado y responde con formato estándar.
 * Nunca expone el stack trace al cliente (OWASP: Information Exposure).
 */
function errorHandler(err, req, res, _next) {
  // Errores de validación de express-validator (ya se manejan en los controllers,
  // este bloque es la segunda línea de defensa)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Cuerpo de la petición demasiado grande.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido.' });
  }

  console.error(`[${new Date().toISOString()}] Error no controlado:`, err.message);

  return res.status(500).json({ message: 'Error interno del servidor.' });
}

module.exports = errorHandler;
