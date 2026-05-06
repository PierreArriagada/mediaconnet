import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { NotificacionesNativasService } from './core/services/notificaciones-nativas.service';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet /></ion-app>`,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private readonly notificacionesNativas = inject(NotificacionesNativasService);

  ngOnInit(): void {
    void this.notificacionesNativas.inicializar();
    void this.initStatusBar();
  }

  private async initStatusBar(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  }
}
