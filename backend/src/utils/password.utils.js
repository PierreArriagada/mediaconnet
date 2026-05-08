/**
 * Utilidades compartidas para validación de contraseñas.
 */

function isValidPassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return password.length >= 8 && password.length <= 128;
}

module.exports = {
  isValidPassword,
};
