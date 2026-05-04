import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService, NotificacionAdmin } from '../../../core/services/admin.service';
import { NotificacionesAdminStateService } from '../../../core/services/notificaciones-admin-state.service';

@Component({
  standalone: true,
  selector: 'app-admin-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  imports: [CommonModule, IonicModule],
})
export class NotificacionesPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly location = inject(Location);
  private readonly notificacionesState = inject(NotificacionesAdminStateService);

  notificaciones: NotificacionAdmin[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getNotificaciones().subscribe({
      next: (resp) => {
        this.notificaciones = resp.notificaciones;
        this.actualizarContadorNoLeidas();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando notificaciones admin:', err);
        this.errorMessage = 'No fue posible cargar las notificaciones.';
        this.isLoading = false;
      },
    });
  }

  // Edu: alterna el estado de lectura de una notificación admin sin recargar toda la vista.
  alternarLectura(notificacion: NotificacionAdmin): void {
    const nuevoEstado = !notificacion.leida;

    this.adminService.actualizarEstadoNotificacion(
      notificacion.id_notificacion,
      nuevoEstado,
    ).subscribe({
      next: (resp) => {
        this.notificaciones = this.notificaciones.map((item) =>
          item.id_notificacion === resp.notificacion.id_notificacion
            ? resp.notificacion
            : item,
        );
        this.actualizarContadorNoLeidas();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error actualizando notificación admin:', err);
        this.errorMessage = 'No fue posible actualizar la notificación.';
      },
    });
  }

  // Edu: elimina una notificación admin del listado y del backend.
  eliminarNotificacion(notificacion: NotificacionAdmin): void {
    this.adminService.eliminarNotificacion(notificacion.id_notificacion).subscribe({
      next: () => {
        this.notificaciones = this.notificaciones.filter(
          (item) => item.id_notificacion !== notificacion.id_notificacion,
        );
        this.actualizarContadorNoLeidas();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando notificación admin:', err);
        this.errorMessage = 'No fue posible eliminar la notificación.';
      },
    });
  }
  // Edu: actualiza el contador global de no leídas
  private actualizarContadorNoLeidas(): void {
    const totalNoLeidas = this.notificaciones.filter((item) => !item.leida).length;
    this.notificacionesState.setNoLeidas(totalNoLeidas);
  }

  // Edu: vuelve a la vista anterior (igual que médico)
  volver(): void {
    this.location.back();
  }
}