import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoService, NotificacionMedico } from '../../../core/services/medico.service';
import { NotificacionesMedicoStateService } from '../../../core/services/notificaciones-medico-state.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, MedicoHeaderComponent, MedicoBottomNavComponent]
})
export class NotificacionesPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  private readonly medicoService = inject(MedicoService);
  private readonly notificacionesState = inject(NotificacionesMedicoStateService);

  notificaciones: NotificacionMedico[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  // Edu: sincroniza el contador de la campanita con las notificaciones no leídas
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
      next: (data) => {
        this.notificaciones = data.notificaciones;
        this.actualizarContadorNoLeidas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando notificaciones:', err);
        this.errorMessage = 'No fue posible cargar las notificaciones.';
        this.isLoading = false;
      }
    });
  }

  // Edu: alterna el estado de lectura de una notificación sin recargar toda la vista
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

  // Edu: elimina una notificación del listado y del backend
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
