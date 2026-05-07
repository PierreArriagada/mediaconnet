/** Configuración del entorno de DESARROLLO local */
export const environment = {
  production: false,
  // URL del backend para emulador Android: 10.0.2.2 apunta al host local donde corre Docker
  // En producción, esto será la URL de tu API real / Supabase
  apiUrl: 'http://10.0.2.2:3000/api',
  // Cadena de conexión de la base de datos local (solo para referencia del equipo)
  dbHost: 'mediconnect-postgres',
  dbPort: 5432,
  dbName: 'mediconnect',
};
