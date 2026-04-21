import { Component, inject, OnInit } from '@angular/core';
import { IonContent, IonRefresher, IonRefresherContent, ModalController, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  Notificacion,
  NotificacionesPacienteData,
  PacienteService,
} from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { McAlertComponent } from '../../../shared/components/alertas-sistema/mc-alert/mc-alert.component';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonRefresher,
    IonRefresherContent,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class NotificacionesPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc = inject(PacienteService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  readonly user = this.auth.getCurrentUser();

  notificaciones: Notificacion[] = [];
  noLeidas = 0;
  isLoading = true;
  limpiando = false;
  sincronizandoLectura = false;

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(event?: { target: { complete: () => void } }): void {
    this.isLoading = true;
    this.svc.getNotificaciones().subscribe({
      next: (data: NotificacionesPacienteData) => {
        this.notificaciones = data.notificaciones;
        this.noLeidas = data.noLeidas;
        this.notificacionesState.setNoLeidas(data.noLeidas);
        this.isLoading = false;
        event?.target?.complete();
        this.marcarComoLeidasSiCorresponde(data);
      },
      error: async (err) => {
        this.isLoading = false;
        event?.target?.complete();
        await this.mostrarToast(err?.error?.message ?? 'No se pudieron cargar las notificaciones.', 'danger');
      },
    });
  }

  tiempoRelativo(fechaISO: string): string {
    const diffMs = Date.now() - new Date(fechaISO).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 60) return `Hace ${Math.max(diffMin, 1)}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Ayer';
    return `Hace ${diffD}d`;
  }

  iconoNotificacion(tipo: string): string {
    const mapa: Record<string, string> = {
      recordatorio: 'event_available',
      confirmacion: 'check_circle',
      cancelacion: 'cancel',
      reprogramacion: 'event_repeat',
      general: 'info',
    };
    return mapa[tipo] ?? 'notifications';
  }

  async confirmarLimpieza(): Promise<void> {
    if (!this.notificaciones.length || this.limpiando) return;

    const modal = await this.modalCtrl.create({
      component: McAlertComponent,
      cssClass: 'mc-alert-modal',
      componentProps: {
        titulo: 'Limpiar notificaciones',
        mensaje: 'Se eliminarán las notificaciones visibles de tu cuenta. Esta acción no se puede deshacer.',
        btnConfirmar: 'Sí, limpiar',
        colorConfirmar: 'danger',
        icono: 'delete',
      },
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (!data?.confirmado) return;

    this.limpiarNotificaciones();
  }

  get resumenLeidas(): string {
    if (!this.notificaciones.length) return 'Sin movimientos pendientes';
    return this.noLeidas > 0 ? `${this.noLeidas} pendientes por revisar` : 'Todas tus notificaciones ya fueron revisadas';
  }

  private marcarComoLeidasSiCorresponde(data: NotificacionesPacienteData): void {
    if (!data.noLeidas || this.sincronizandoLectura) {
      return;
    }

    const notificacionesOriginales = data.notificaciones.map((n) => ({ ...n }));

    this.sincronizandoLectura = true;
    this.notificaciones = data.notificaciones.map((n) => ({ ...n, leida: true }));
    this.noLeidas = 0;
    this.notificacionesState.limpiarBadge();

    this.svc.marcarNotificacionesLeidas().subscribe({
      next: () => {
        this.sincronizandoLectura = false;
      },
      error: async (err) => {
        this.sincronizandoLectura = false;
        this.notificaciones = notificacionesOriginales;
        this.noLeidas = data.noLeidas;
        this.notificacionesState.setNoLeidas(data.noLeidas);
        await this.mostrarToast(err?.error?.message ?? 'No se pudo actualizar el estado de lectura.', 'danger');
      },
    });
  }

  private limpiarNotificaciones(): void {
    this.limpiando = true;
    this.svc.limpiarNotificaciones().subscribe({
      next: async (res) => {
        this.notificaciones = [];
        this.noLeidas = 0;
        this.notificacionesState.registrarLimpiezaTotal();
        this.limpiando = false;
        await this.mostrarToast(res.message, 'success');
      },
      error: async (err) => {
        this.limpiando = false;
        await this.mostrarToast(err?.error?.message ?? 'No se pudieron limpiar las notificaciones.', 'danger');
      },
    });
  }

  private async mostrarToast(message: string, color: 'danger' | 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}