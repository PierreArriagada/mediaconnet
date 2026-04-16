/** Configuración del entorno de DESARROLLO local */
export const environment = {
  production: false,
  // URL del backend - apunta al contenedor de la app corriendo en Docker
  // En producción, esto será la URL de tu API real / Supabase
  apiUrl: 'http://localhost:3000/api',
  // Cadena de conexión de la base de datos local (solo para referencia del equipo)
  dbHost: 'mediconnect-postgres',
  dbPort: 5432,
  dbName: 'mediconnect',
};
