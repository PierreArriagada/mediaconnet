const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware de autenticación JWT.
 * Verifica el token Bearer en el header Authorization.
 * Se aplica a rutas protegidas (dashboard, citas, etc.).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifica firma y expiración del token
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

/**
 * Middleware de autorización por rol.
 * Uso: requireRole('Administrador') o requireRole('Medico', 'Administrador')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso denegado. Rol insuficiente.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
