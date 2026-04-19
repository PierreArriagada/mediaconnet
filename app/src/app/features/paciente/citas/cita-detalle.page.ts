import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast, AlertController } from '@ionic/angular/standalone';
import {
  PacienteService,
  DetalleCitaData,
  DetalleCita,
} from '../../../core/services/paciente.service';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

/** Pasos del timeline según el estado de la cita */
interface PasoTimeline {
  label:       string;
  sublabel:    string;
  estado:      'completado' | 'activo' | 'pendiente';
}

@Component({
  standalone: true,
  selector: 'app-cita-detalle',
  templateUrl: './cita-detalle.page.html',
  styleUrls: ['./cita-detalle.page.scss'],
  imports: [CommonModule, IonContent, IonToast, PacienteHeaderComponent, PacienteBottomNavComponent],
})
export default class CitaDetallePage implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly svc        = inject(PacienteService);
  private readonly authSvc    = inject(AuthService);
  private readonly alertCtrl  = inject(AlertController);

  userName  = '';
  noLeidas  = 0;
  cita: DetalleCita | null = null;
  isLoading = true;

  showError   = false;
  showSuccess = false;
  errorMsg    = '';
  successMsg  = '';

  isCancelling  = signal(false);

  ngOnInit(): void {
    const user = this.authSvc.getCurrentUser();
    this.userName = user?.name ?? '';

    const idCita = Number(this.route.snapshot.paramMap.get('idCita'));
    if (!idCita || idCita < 1) {
      this.router.navigate(['/paciente/home']);
      return;
    }
    this.loadCita(idCita);
  }

  loadCita(idCita: number): void {
    this.svc.getDetalleCita(idCita).subscribe({
      next: (data: DetalleCitaData) => {
        this.cita      = data.cita;
        this.noLeidas  = data.noLeidas;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cargar el detalle de la cita.';
        this.showError = true;
      },
    });
  }

  // ── Timeline dinámico según estado_cita ───────────────
  get pasos(): PasoTimeline[] {
    const estado = this.cita?.estado_cita ?? 'pendiente';

    if (estado === 'cancelada') {
      return [
        { label: 'Recibida',   sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Cancelada',  sublabel: 'La cita fue cancelada', estado: 'activo' },
      ];
    }

    if (estado === 'reprogramada') {
      return [
        { label: 'Recibida',       sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Reprogramada',   sublabel: 'Se asignó un nuevo horario', estado: 'activo' },
        { label: 'Confirmada',     sublabel: 'Pendiente de confirmación', estado: 'pendiente' },
      ];
    }

    if (estado === 'completada') {
      return [
        { label: 'Recibida',    sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Confirmada',  sublabel: 'Cita confirmada', estado: 'completado' },
        { label: 'Completada',  sublabel: 'Atención realizada', estado: 'completado' },
      ];
    }

    if (estado === 'confirmada') {
      return [
        { label: 'Recibida',    sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Confirmada',  sublabel: 'Tu cita está confirmada', estado: 'activo' },
        { label: 'Completada',  sublabel: 'Pendiente de atención', estado: 'pendiente' },
      ];
    }

    // pendiente
    return [
      { label: 'Recibida',    sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
      { label: 'Confirmada',  sublabel: 'Pendiente de confirmación', estado: 'pendiente' },
      { label: 'Completada',  sublabel: 'Pendiente de atención', estado: 'pendiente' },
    ];
  }

  /** Determina si la cita puede ser cancelada o reagendada */
  get puedeModificar(): boolean {
    return ['pendiente', 'confirmada'].includes(this.cita?.estado_cita ?? '');
  }

  get chipEstado(): { label: string; clase: string } {
    const mapa: Record<string, { label: string; clase: string }> = {
      pendiente:     { label: 'Pendiente',     clase: 'mc-chip--warning' },
      confirmada:    { label: 'Confirmada',    clase: 'mc-chip--primary' },
      cancelada:     { label: 'Cancelada',     clase: 'mc-chip--error' },
      reprogramada:  { label: 'Reprogramada',  clase: 'mc-chip--secondary' },
      completada:    { label: 'Completada',    clase: 'mc-chip--success' },
    };
    return mapa[this.cita?.estado_cita ?? 'pendiente'] ?? mapa['pendiente'];
  }

  // ── Acciones ──────────────────────────────────────────

  async confirmarCancelar(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar cita',
      message: '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí, cancelar', role: 'destructive', handler: () => this.cancelar() },
      ],
    });
    await alert.present();
  }

  private cancelar(): void {
    if (this.isCancelling() || !this.cita) return;
    this.isCancelling.set(true);

    this.svc.cancelarCita(this.cita.id_cita).subscribe({
      next: () => {
        this.successMsg  = 'Cita cancelada correctamente.';
        this.showSuccess = true;
        // Recargar datos para reflejar el nuevo estado
        setTimeout(() => this.loadCita(this.cita!.id_cita), 1500);
        this.isCancelling.set(false);
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.errorMsg  = err?.error?.message ?? 'No se pudo cancelar la cita.';
        this.showError = true;
      },
    });
  }

  reagendar(): void {
    if (!this.cita) return;
    // Navegar al flujo de elegir horario con el mismo médico
    this.router.navigate(['/paciente/elegir-horario', this.cita.id_medico], {
      queryParams: {
        reagendarCita: this.cita.id_cita,
        especialidad:  this.cita.nombre_especialidad,
      },
    });
  }

  // ── Helpers de formato ────────────────────────────────

  get titulo(): string {
    const nombre = this.cita?.medico_nombre ?? '';
    return nombre.endsWith('a') ? 'Dra.' : 'Dr.';
  }

  get iniciales(): string {
    return `${(this.cita?.medico_nombre ?? '').charAt(0)}${(this.cita?.medico_apellido ?? '').charAt(0)}`.toUpperCase();
  }

  formatFecha(fecha: string | null): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('T')[0].split('-').map(Number);
    const fechaObj = new Date(y, m - 1, d);
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${d} de ${meses[m - 1]}, ${y}`;
  }

  formatFechaCorta(fecha: string | null): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatHora(hora: string | null): string {
    return hora?.slice(0, 5) ?? '—';
  }

  formatFechaLarga(fecha: string | null): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('T')[0].split('-').map(Number);
    const dias  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaObj = new Date(y, m - 1, d);
    return `${dias[fechaObj.getDay()]} ${d} de ${meses[m - 1]}, ${y}`;
  }

  ir(path: string): void {
    this.router.navigate(['/paciente', path]);
  }

  volver(): void {
    window.history.back();
  }
}
