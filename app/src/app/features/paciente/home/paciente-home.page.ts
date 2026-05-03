import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import {
  IonContent, IonToast,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  PacienteService,
  DashboardData,
  CitaPendienteConfirmacion,
  Notificacion,
} from '../../../core/services/paciente.service';
import { NotificacionesNativasService } from '../../../core/services/notificaciones-nativas.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import {
  formatFechaCompleta,
  formatHoraCorta,
  tiempoRelativoCorto,
} from '../../../shared/utils/fecha.utils';

type HistorialTab = 'pendientes' | 'confirmadas' | 'pasadas';

@Component({
  selector: 'app-paciente-home',
  templateUrl: './paciente-home.page.html',
  styleUrls:   ['./paciente-home.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonToast,
    IonRefresher, IonRefresherContent,
    PacienteBottomNavComponent,
    PacienteHeaderComponent,
  ],
})
export class PacienteHomePage implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly svc    = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly notificacionesNativas = inject(NotificacionesNativasService);
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  user      = this.auth.getCurrentUser();
  data: DashboardData | null = null;
  isLoading  = true;
  errorMsg   = '';
  showError  = false;

  // Modal de confirmación de asistencia 24h
  showConfirmModal   = false;
  citaConfirmar: CitaPendienteConfirmacion | null = null;
  confirmLoading     = false;

  // localStorage SOLO para "Ahora no": la BD (confirmada_asistencia) es fuente de verdad
  // para confirmar/cancelar; aquí solo suprimimos el re-show cuando el usuario descarta sin actuar.
  private readonly LS_DISMISSED = 'mc-cit-dismissed-';
  private readonly TTL_DISMISSED = 24 * 60 * 60 * 1000; // 24h = cubre la ventana del backend

  /** True si el usuario ya descartó este modal con "Ahora no" en las últimas 24h */
  private esCitaDismissed(idCita: number): boolean {
    try {
      const raw = localStorage.getItem(this.LS_DISMISSED + idCita);
      if (!raw) return false;
      return (Date.now() - parseInt(raw, 10)) < this.TTL_DISMISSED;
    } catch {
      return false;
    }
  }

  /** Marca la cita como "descartada por el usuario" en localStorage */
  private marcarCitaDismissed(idCita: number): void {
    try {
      localStorage.setItem(this.LS_DISMISSED + idCita, Date.now().toString());
    } catch { /* sin-op si localStorage no disponible */ }
  }

  /** Primer nombre del usuario para el saludo */
  get firstName(): string {
    return this.user?.name?.split(' ')[0] ?? '';
  }

  get notificacionesRecientes(): Notificacion[] {
    if (this.notificacionesState.fueronLimpiadas()) {
      return [];
    }

    const notificaciones = this.data?.notificaciones ?? [];
    if ((this.notificacionesState.noLeidas() ?? this.data?.noLeidas ?? 0) > 0) {
      return notificaciones;
    }

    return notificaciones.map((n) => ({ ...n, leida: true }));
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(event?: { target: { complete: () => void } }): void {
    this.svc.getDashboard().subscribe({
      next: (d) => {
        this.data      = d;
        this.notificacionesState.setNoLeidas(d.noLeidas);
        this.isLoading = false;
        event?.target?.complete();
        // Si hay cita dentro de 24h sin confirmar → mostrar modal
        // La BD (confirmada_asistencia IS NOT TRUE) es la fuente de verdad.
        // Solo se suprime si el usuario lo descartó con "Ahora no" (sin actuar en BD).
        if (d.citaPendienteConfirmacion && !this.esCitaDismissed(d.citaPendienteConfirmacion.id_cita)) {
          this.citaConfirmar   = d.citaPendienteConfirmacion;
          this.showConfirmModal = true;
          void this.notificacionesNativas.notificarConfirmacionPendiente(d.citaPendienteConfirmacion);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cargar el dashboard.';
        this.showError = true;
        event?.target?.complete();
      },
    });
  }

  /** Formatea fecha ISO a "12 abr. 2026" sin desfase de zona horaria */
  formatFecha(fecha: string | null | undefined): string {
    return formatFechaCompleta(fecha);
  }

  /** Recorta la hora a "HH:mm" */
  formatHora(hora: string | null | undefined): string {
    return formatHoraCorta(hora);
  }

  /** Tiempo relativo legible para notificaciones */
  tiempoRelativo(fechaISO: string): string {
    return tiempoRelativoCorto(fechaISO);
  }

  /** Icono Material Symbol según el tipo de notificación */
  iconoNotificacion(tipo: string): string {
    const mapa: Record<string, string> = {
      recordatorio:   'event_available',
      confirmacion:   'check_circle',
      cancelacion:    'cancel',
      reprogramacion: 'event_repeat',
      general:        'info',
    };
    return mapa[tipo] ?? 'notifications';
  }

  /** El paciente confirma que asistirá a la cita */
  onConfirmarAsistencia(): void {
    if (!this.citaConfirmar || this.confirmLoading) return;

    const citaActual = this.citaConfirmar;

    this.confirmLoading = true;
    this.svc.confirmarAsistencia(citaActual.id_cita).subscribe({
      next: () => {
        // BD actualiza confirmada_asistencia=TRUE → el backend ya no devolverá esta cita
        void this.notificacionesNativas.limpiarRecordatorioConfirmacion(citaActual);
        this.confirmLoading  = false;
        this.showConfirmModal = false;
        this.citaConfirmar   = null;
        this.loadDashboard();
      },
      error: (err) => {
        this.confirmLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al confirmar asistencia.';
        this.showError = true;
      },
    });
  }

  /** El paciente cancela la cita desde el modal de confirmación */
  onCancelarDesdeModal(): void {
    if (!this.citaConfirmar || this.confirmLoading) return;

    const citaActual = this.citaConfirmar;

    this.confirmLoading = true;
    this.svc.cancelarCita(citaActual.id_cita).subscribe({
      next: () => {
        // BD cambia estado_cita='cancelada' → la cita ya no estará en ventana de confirmación
        void this.notificacionesNativas.limpiarRecordatorioConfirmacion(citaActual);
        this.confirmLoading  = false;
        this.showConfirmModal = false;
        this.citaConfirmar   = null;
        this.loadDashboard();
      },
      error: (err) => {
        this.confirmLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cancelar la cita.';
        this.showError = true;
      },
    });
  }

  /** El paciente cierra el modal sin tomar acción ("Ahora no") */
  onCerrarModal(): void {
    if (!this.citaConfirmar) return;
    // localStorage: BD sigue con confirmada_asistencia=NULL, guardamos dismissed
    // para no re-mostrar el modal en pull-to-refresh durante las próximas 24h.
    this.marcarCitaDismissed(this.citaConfirmar.id_cita);
    this.showConfirmModal = false;
    this.citaConfirmar    = null;
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Navega a rutas simples dentro del módulo /paciente/ */
  ir(path: string): void {
    this.router.navigate(['/paciente', path]);
  }

  irHistorial(tab: HistorialTab): void {
    this.router.navigate(['/paciente', 'historial'], { queryParams: { tab } });
  }

  /** Navega al detalle de una cita específica */
  verCita(idCita: number): void {
    this.router.navigate(['/paciente', 'citas', idCita]);
  }
}
