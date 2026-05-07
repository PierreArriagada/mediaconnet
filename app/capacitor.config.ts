import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediconnect.app',
  appName: 'MediConnect',
  webDir: 'www',
  server: {
    // En desarrollo Android local, usar HTTP evita bloqueo por Mixed Content
    // cuando la app consume la API local en http://10.0.2.2:3000/api
    androidScheme: 'http',
  },
};

export default config;
