import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediconnect.app',
  appName: 'MediConnect',
  webDir: 'www',
  server: {
    // En desarrollo con Live Reload desde el contenedor Docker
    // androidScheme: 'https',
  },
};

export default config;
