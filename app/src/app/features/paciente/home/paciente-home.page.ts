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
} from '../../../core/services/paciente.service';
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

  user      = this.auth.getCurrentUser();
  data: DashboardData | null = null;
  isLoading  = true;
  errorMsg   = '';
  showError  = false;

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

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Navega a rutas dentro del módulo /paciente/ */
  ir(path: string): void {
    this.router.navigate(['/paciente', path]);
  }
}
