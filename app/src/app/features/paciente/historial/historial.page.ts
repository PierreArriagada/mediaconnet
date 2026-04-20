import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';

import {
  PacienteService,
  CitaHistorial,
  HistorialData,
} from '../../../core/services/paciente.service';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

export type HistorialTab = 'pendientes' | 'confirmadas' | 'pasadas';

interface BadgeInfo {
  label:    string;
  modifier: string; // clase BEM --modifier
  icon:     string; // Material Symbol
}

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls:   ['./historial.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonRefresher, IonRefresherContent, IonSpinner,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class HistorialPage implements OnInit {
  private readonly svc       = inject(PacienteService);
  private readonly authSvc   = inject(AuthService);
  private readonly router    = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  userName  = '';
  noLeidas  = 0;
  isLoading = true;
  citas     = signal<CitaHistorial[]>([]);

  // Tab activo como signal para reactivity en template
  tabActivo = signal<HistorialTab>('pendientes');

  ngOnInit(): void {
    this.userName = this.authSvc.getCurrentUser()?.name ?? '';
    this.cargarHistorial();
  }

  cargarHistorial(event?: { target: { complete: () => void } }): void {
    this.isLoading = true;
    this.svc.getHistorial(this.tabActivo()).subscribe({
      next: (data: HistorialData) => {
        this.citas.set(data.citas);
        this.noLeidas  = data.noLeidas;
        this.isLoading = false;
        event?.target?.complete();
      },
      error: async (err) => {
        this.isLoading = false;
        event?.target?.complete();
        const toast = await this.toastCtrl.create({
          message:  err?.error?.message ?? 'Error al cargar el historial.',
          duration: 3500,
          color:    'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  cambiarTab(tab: HistorialTab): void {
    if (this.tabActivo() === tab) return;
    this.tabActivo.set(tab);
    this.cargarHistorial();
  }

  /**
   * Determina el badge visual según el estado real de la cita.
   * En historial solo hay usuarios autenticados: es_invitado ya no distingue el badge.
   * "En revisión" es un concepto de admin, el paciente siempre ve el estado_cita real.
   */
  badgeEstado(cita: CitaHistorial): BadgeInfo {
    const mapa: Record<string, BadgeInfo> = {
      pendiente:    { label: 'Pendiente',    modifier: 'pendiente',    icon: 'schedule' },
      confirmada:   { label: 'Confirmada',   modifier: 'confirmada',   icon: 'check_circle' },
      reprogramada: { label: 'Reprogramada', modifier: 'reprogramada', icon: 'event_repeat' },
      completada:   { label: 'Completada',   modifier: 'completada',   icon: 'task_alt' },
      cancelada:    { label: 'Cancelada',    modifier: 'cancelada',    icon: 'cancel' },
    };
    return mapa[cita.estado_cita] ?? { label: cita.estado_cita, modifier: 'pendiente', icon: 'info' };
  }

  /** Formatea fecha ISO sin desfase de zona horaria */
  formatFecha(fecha: string): string {
    const [y, m, d] = fecha.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  verDetalle(idCita: number): void {
    this.router.navigate(['/paciente/citas', idCita]);
  }

  nuevaReserva(): void {
    this.router.navigate(['/paciente/reservar']);
  }

  /** Solo las citas en tabs activos (pendientes/confirmadas) permiten acciones */
  get estaEnTabActivo(): boolean {
    return this.tabActivo() === 'pendientes' || this.tabActivo() === 'confirmadas';
  }
}
