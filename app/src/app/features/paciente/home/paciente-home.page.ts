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
} from '../../../core/services/paciente.service';
import { NotificacionesNativasService } from '../../../core/services/notificaciones-nativas.service';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';

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

  user      = this.auth.getCurrentUser();
  data: DashboardData | null = null;
  isLoading  = true;
  errorMsg   = '';
  showError  = false;

  // Modal de confirmación de asistencia 24h
  showConfirmModal   = false;
  citaConfirmar: CitaPendienteConfirmacion | null = null;
  confirmLoading     = false;

  // Prefijo para localStorage + TTL de 25h (cubre la ventana de 24h del backend)
  private readonly LS_PREFIX = 'mc-cit-conf-';
  private readonly TTL_MS    = 25 * 60 * 60 * 1000;

  /** Retorna true si el paciente ya gestionó esta cita en las últimas 25h */
  private esCitaYaGestionada(idCita: number): boolean {
    try {
      const raw = localStorage.getItem(this.LS_PREFIX + idCita);
      if (!raw) return false;
      return (Date.now() - parseInt(raw, 10)) < this.TTL_MS;
    } catch {
      return false;
    }
  }

  /** Guarda en localStorage el timestamp actual para la cita indicada */
  private marcarCitaGestionada(idCita: number): void {
    try {
      localStorage.setItem(this.LS_PREFIX + idCita, Date.now().toString());
    } catch { /* sin-op si localStorage no disponible */ }
  }

  /** Primer nombre del usuario para el saludo */
  get firstName(): string {
    return this.user?.name?.split(' ')[0] ?? '';
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(event?: { target: { complete: () => void } }): void {
    this.svc.getDashboard().subscribe({
      next: (d) => {
        this.data      = d;
        this.isLoading = false;
        event?.target?.complete();
        // Si hay cita dentro de 24h sin confirmar → mostrar modal (solo si no fue ya gestionada)
        if (d.citaPendienteConfirmacion && !this.esCitaYaGestionada(d.citaPendienteConfirmacion.id_cita)) {
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
    if (!fecha) return '—';
    const [y, m, d] = (fecha as string).split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  /** Recorta la hora a "HH:mm" */
  formatHora(hora: string | null | undefined): string {
    if (!hora) return '—';
    return (hora as string).slice(0, 5);
  }

  /** Tiempo relativo legible para notificaciones */
  tiempoRelativo(fechaISO: string): string {
    const diffMs  = Date.now() - new Date(fechaISO).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 60)  return `Hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH  < 24)   return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD  === 1)  return 'Ayer';
    return `Hace ${diffD}d`;
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
        this.marcarCitaGestionada(citaActual.id_cita);
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
        this.marcarCitaGestionada(citaActual.id_cita);
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
    this.marcarCitaGestionada(this.citaConfirmar.id_cita);
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

  /** Navega al detalle de una cita específica */
  verCita(idCita: number): void {
    this.router.navigate(['/paciente', 'citas', idCita]);
  }
}
