import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediconnect.app',
  appName: 'MediConnect',
  webDir: 'www',
  server: {
    // Esquema HTTPS por defecto para builds Android/iOS.
    // Para desarrollo local con emulador Android usar:
    //   adb reverse tcp:3000 tcp:3000
    // Esto hace que localhost:3000 dentro del emulador apunte al host.
    androidScheme: 'https',
  },
};

export default config;
