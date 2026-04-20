import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

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
  }
}
