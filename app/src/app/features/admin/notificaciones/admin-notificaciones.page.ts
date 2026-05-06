import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, ToastController } from '@ionic/angular/standalone';

import {
  AdminService,
  AdminNotificacion,
} from '../../../core/services/admin.service';
import { NotificacionesAdminStateService } from '../../../core/services/notificaciones-admin-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

@Component({
  selector: 'app-admin-notificaciones',
  templateUrl: './admin-notificaciones.page.html',
  styleUrls: ['./admin-notificaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class AdminNotificacionesPage implements OnInit {
  private readonly adminSvc   = inject(AdminService);
  private readonly state      = inject(NotificacionesAdminStateService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly toastCtrl  = inject(ToastController);

  user = this.auth.getCurrentUser();

  cargando       = signal(true);
  errorCarga     = signal(false);
  notificaciones = signal<AdminNotificacion[]>([]);
  marcando       = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.adminSvc.getNotificacionesAdmin().subscribe({
      next: (data) => {
        this.notificaciones.set(data.notificaciones);
        this.state.setNoLeidas(data.noLeidas);
        this.cargando.set(false);
        this.errorCarga.set(false);

        // Marcar todas como leídas al abrir la página
        if (data.noLeidas > 0) {
          this.adminSvc.marcarNotificacionesLeidasAdmin().subscribe({
            next: () => {
              this.state.setNoLeidas(0);
              // Actualizar el estado local para que se vean como leídas
              this.notificaciones.update(list =>
                list.map(n => ({ ...n, leida: true }))
              );
            },
          });
        }
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  /**
   * Las notificaciones de solicitudes de cita invitado navegan directamente
   * a la cola de revisión para que el admin actúe de inmediato.
   */
  accionarNotificacion(notif: AdminNotificacion): void {
    const esSolicitud = notif.titulo?.toLowerCase().includes('solicitud') ||
                        notif.mensaje?.toLowerCase().includes('solicitud');

    if (esSolicitud) {
      this.router.navigate(['/admin/operacion/solicitudes']);
    }
  }

  esSolicitud(notif: AdminNotificacion): boolean {
    return notif.titulo?.toLowerCase().includes('solicitud') ||
           notif.mensaje?.toLowerCase().includes('solicitud');
  }

  formatFecha(ts: string | null | undefined): string {
    if (!ts) return '—';
    const d = new Date(ts);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const soloFecha = (date: Date) =>
      `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (soloFecha(d) === soloFecha(hoy)) {
      return `Hoy, ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (soloFecha(d) === soloFecha(ayer)) {
      return `Ayer, ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  volver(): void {
    this.router.navigate(['/admin/home']);
  }

  eliminarItem(n: AdminNotificacion): void {
    if (this.esSolicitud(n)) {
      this.router.navigate(['/admin/operacion/solicitudes']);
    }
    this.adminSvc.eliminarNotificacion(n.id_notificacion).subscribe({
      next: () => {
        this.notificaciones.update(list =>
          list.filter(item => item.id_notificacion !== n.id_notificacion)
        );
        this.state.setNoLeidas(
          this.notificaciones().filter(item => !item.leida).length
        );
      },
    });
  }

  limpiarTodo(): void {
    this.adminSvc.limpiarNotificaciones().subscribe({
      next: () => {
        this.notificaciones.set([]);
        this.state.setNoLeidas(0);
      },
    });
  }
}
