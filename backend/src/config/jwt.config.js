/**
 * Configuración centralizada de JWT.
 * Al agregar claims nuevos (como id_paciente, especialidad),
 * solo se modifica este archivo.
 */

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no definido en las variables de entorno.');
  process.exit(1);
}

module.exports = { JWT_SECRET, JWT_EXPIRES };
