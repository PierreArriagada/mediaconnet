import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Router con lazy loading y preload de rutas
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // HTTP Client con interceptor de token Bearer
    provideHttpClient(withInterceptors([tokenInterceptor])),
    // Ionic Framework en modo Standalone
    provideIonicAngular({ mode: 'md' }),
  ],
};
