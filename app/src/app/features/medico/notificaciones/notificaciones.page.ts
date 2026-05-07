import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoService, NotificacionMedico, NotificacionesMedicoData } from '../../../core/services/medico.service';
import { NotificacionesMedicoStateService } from '../../../core/services/notificaciones-medico-state.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

@Component({
  selector: 'app-medico-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, MedicoHeaderComponent, MedicoBottomNavComponent]
})
export class NotificacionesPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  private readonly medicoService = inject(MedicoService);
  private readonly notificacionesState = inject(NotificacionesMedicoStateService);

  notificaciones: NotificacionMedico[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  sincronizandoLectura = false;

  // Sincroniza el contador de la campanita con las notificaciones no leídas
  private actualizarContadorNoLeidas(): void {
    const totalNoLeidas = this.notificaciones.filter((item) => !item.leida).length;
    this.notificacionesState.setNoLeidas(totalNoLeidas);
  }

  volver(): void {
    this.location.back();
  }

  user = this.authService.getCurrentUser();

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.medicoService.getNotificaciones().subscribe({
      next: (data: NotificacionesMedicoData) => {
        this.notificaciones = data.notificaciones;
        this.notificacionesState.setNoLeidas(data.noLeidas);
        this.isLoading = false;
        this.marcarComoLeidasSiCorresponde(data);
      },
      error: (err) => {
        console.error('Error cargando notificaciones:', err);
        this.errorMessage = 'No fue posible cargar las notificaciones.';
        this.isLoading = false;
      }
    });
  }

  private marcarComoLeidasSiCorresponde(data: NotificacionesMedicoData): void {
    if (!data.noLeidas || this.sincronizandoLectura) {
      return;
    }

    const notificacionesOriginales = data.notificaciones.map((n) => ({ ...n }));

    this.sincronizandoLectura = true;
    this.notificaciones = data.notificaciones.map((n) => ({ ...n, leida: true }));
    this.notificacionesState.limpiarBadge();

    this.medicoService.marcarNotificacionesLeidas().subscribe({
      next: () => {
        this.sincronizandoLectura = false;
      },
      error: (err) => {
        this.sincronizandoLectura = false;
        this.notificaciones = notificacionesOriginales;
        this.notificacionesState.setNoLeidas(data.noLeidas);
        console.error('Error marcando notificaciones como leídas:', err);
        this.errorMessage = 'No fue posible actualizar el estado de lectura.';
      }
    });
  }

  alternarLectura(notificacion: NotificacionMedico): void {
    const nuevoEstado = !notificacion.leida;

    this.medicoService.actualizarEstadoNotificacion(
      notificacion.id_notificacion,
      nuevoEstado
    ).subscribe({
      next: (resp) => {
        this.notificaciones = this.notificaciones.map((item) =>
          item.id_notificacion === resp.notificacion.id_notificacion
            ? resp.notificacion
            : item
        );
        this.actualizarContadorNoLeidas();
      },
      error: (err) => {
        console.error('Error actualizando notificación:', err);
        this.errorMessage = 'No fue posible actualizar la notificación.';
      }
    });
  }

  eliminarNotificacion(notificacion: NotificacionMedico): void {
    this.medicoService.eliminarNotificacion(notificacion.id_notificacion).subscribe({
      next: () => {
        this.notificaciones = this.notificaciones.filter(
          (item) => item.id_notificacion !== notificacion.id_notificacion
        );
        this.actualizarContadorNoLeidas();
      },
      error: (err) => {
        console.error('Error eliminando notificación:', err);
        this.errorMessage = 'No fue posible eliminar la notificación.';
      }
    });
  }

  limpiarTodo(): void {
    this.medicoService.limpiarNotificaciones().subscribe({
      next: () => {
        this.notificaciones = [];
        this.notificacionesState.setNoLeidas(0);
      },
      error: (err) => {
        console.error('Error limpiando notificaciones:', err);
        this.errorMessage = 'No fue posible limpiar las notificaciones.';
      }
    });
  }

}
