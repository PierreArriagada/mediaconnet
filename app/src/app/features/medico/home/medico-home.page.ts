import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import {
  IonContent, IonToast,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  MedicoService,
  DashboardMedicoData,
  CitaMedico,
} from '../../../core/services/medico.service';
import { McAlertComponent } from '../../../shared/components/alertas-sistema/mc-alert/mc-alert.component';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

type TabMedico = 'hoy' | 'proximas';

@Component({
  selector: 'app-medico-home',
  templateUrl: './medico-home.page.html',
  styleUrls:   ['./medico-home.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonToast,
    IonRefresher, IonRefresherContent,
    MedicoHeaderComponent,
    MedicoBottomNavComponent,
  ],
})
export class MedicoHomePage implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly svc      = inject(MedicoService);
  private readonly router   = inject(Router);
  private readonly modalCtrl = inject(ModalController);

  user = this.auth.getCurrentUser();
  data: DashboardMedicoData | null = null;
  isLoading = true;

  errorMsg    = '';
  showError   = false;
  successMsg  = '';
  showSuccess = false;

  tabActivo = signal<TabMedico>('hoy');
  citasTab  = signal<CitaMedico[]>([]);
  isLoadingTab = false;

  // Control de estado para evitar doble-click en marcar asistencia
  marcandoCita = signal<number | null>(null);

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
        // Cargar tab activo
        this.cargarTab();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cargar el dashboard.';
        this.showError = true;
        event?.target?.complete();
      },
    });
  }

  cambiarTab(tab: TabMedico): void {
    if (this.tabActivo() === tab) return;
    this.tabActivo.set(tab);
    this.cargarTab();
  }

  cargarTab(): void {
    this.isLoadingTab = true;
    const obs = this.tabActivo() === 'hoy'
      ? this.svc.getCitasParaMarcar()
      : this.svc.getCitasProximas();

    obs.subscribe({
      next: (res) => {
        this.citasTab.set(res.citas);
        this.isLoadingTab = false;
      },
      error: () => {
        this.isLoadingTab = false;
        this.citasTab.set([]);
      },
    });
  }

  /** Abre modal de confirmación antes de marcar asistencia */
  async confirmarMarcar(cita: CitaMedico, asistio: boolean): Promise<void> {
    const titulo = asistio ? 'Confirmar asistencia' : 'Registrar inasistencia';
    const mensaje = asistio
      ? `¿Confirmas que ${cita.paciente_nombre} ${cita.paciente_apellido} asistió a la cita?`
      : `¿Confirmas que ${cita.paciente_nombre} ${cita.paciente_apellido} NO asistió a la cita?`;

    const modal = await this.modalCtrl.create({
      component: McAlertComponent,
      cssClass: 'mc-alert-modal',
      componentProps: {
        titulo,
        mensaje,
        btnConfirmar: asistio ? 'Sí, asistió' : 'Sí, no asistió',
        colorConfirmar: asistio ? 'success' : 'danger',
        icono: asistio ? 'check_circle' : 'cancel',
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.confirmado) {
      this.marcarAsistencia(cita.id_cita, asistio);
    }
  }

  private marcarAsistencia(idCita: number, asistio: boolean): void {
    if (this.marcandoCita() !== null) return;
    this.marcandoCita.set(idCita);

    this.svc.marcarAsistencia(idCita, asistio).subscribe({
      next: (res) => {
        this.marcandoCita.set(null);
        this.successMsg  = res.message;
        this.showSuccess = true;
        // Recargar datos
        this.loadDashboard();
      },
      error: (err) => {
        this.marcandoCita.set(null);
        this.errorMsg  = err?.error?.message ?? 'Error al registrar asistencia.';
        this.showError = true;
      },
    });
  }

  /** Determina el badge visual para el estado de asistencia */
  badgeAsistencia(cita: CitaMedico): { label: string; clase: string; icono: string } | null {
    if (cita.asistio_cita === true) {
      return { label: 'Asistió', clase: 'md-badge--asistio', icono: 'check_circle' };
    }
    if (cita.asistio_cita === false) {
      return { label: 'No asistió', clase: 'md-badge--no-asistio', icono: 'cancel' };
    }
    return null;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatHora(hora: string): string {
    return hora?.slice(0, 5) ?? '—';
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
