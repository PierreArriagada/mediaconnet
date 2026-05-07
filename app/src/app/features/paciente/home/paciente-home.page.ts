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
import { iconoNotificacionPaciente } from '../../../shared/utils/paciente-ui.utils';

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
  private yaEntroALaVista = false;
  readonly iconoNotificacion = iconoNotificacionPaciente;

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

  ionViewWillEnter(): void {
    if (this.yaEntroALaVista) {
      this.loadDashboard();
    }
    this.yaEntroALaVista = true;
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
        if (d.citaPendienteConfirmacion) {
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
    // No se persiste el cierre: si la cita sigue pendiente, reaparece en la próxima carga.
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
