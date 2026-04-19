import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast, ModalController } from '@ionic/angular/standalone';
import {
  PacienteService,
  DetalleCitaData,
  DetalleCita,
} from '../../../core/services/paciente.service';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { CentroContactoComponent } from '../../../shared/components/centro-contacto/centro-contacto.component';
import { McAlertComponent } from '../../../shared/components/alertas-sistema/mc-alert/mc-alert.component';

/** Pasos del timeline según el estado de la cita (solo invitados/solicitudes) */
interface PasoTimeline {
  label:       string;
  sublabel:    string;
  estado:      'completado' | 'activo' | 'pendiente' | 'cancelado';
}

@Component({
  standalone: true,
  selector: 'app-cita-detalle',
  templateUrl: './cita-detalle.page.html',
  styleUrls: ['./cita-detalle.page.scss'],
  imports: [CommonModule, IonContent, IonToast, PacienteHeaderComponent, PacienteBottomNavComponent, CentroContactoComponent],
})
export default class CitaDetallePage implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly svc        = inject(PacienteService);
  private readonly authSvc    = inject(AuthService);
  private readonly modalCtrl  = inject(ModalController);

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

  // ── Determina si la cita fue reservada directamente (usuario registrado + slot real) ──
  get esCitaDirecta(): boolean {
    return this.cita?.id_disponibilidad !== null && !this.cita?.es_invitado;
  }

  /** Info del estado para citas directas (sin timeline) */
  get estadoSimple(): { icono: string; titulo: string; descripcion: string; clase: string } {
    const estado = this.cita?.estado_cita ?? 'confirmada';
    const mapa: Record<string, { icono: string; titulo: string; descripcion: string; clase: string }> = {
      confirmada:   { icono: 'event_available', titulo: 'Hora confirmada',    descripcion: 'Tu hora está reservada. Te esperamos en la fecha indicada.', clase: 'mc-estado-simple--success'   },
      pendiente:    { icono: 'event_available', titulo: 'Hora reservada',     descripcion: 'Tu cita fue registrada correctamente.',                        clase: 'mc-estado-simple--success'   },
      completada:   { icono: 'task_alt',        titulo: 'Atención realizada', descripcion: 'Tu consulta médica fue completada satisfactoriamente.',         clase: 'mc-estado-simple--completed' },
      cancelada:    { icono: 'event_busy',      titulo: 'Cita cancelada',     descripcion: 'Esta cita fue cancelada.',                                      clase: 'mc-estado-simple--cancelled' },
      reprogramada: { icono: 'update',          titulo: 'Cita reprogramada',  descripcion: 'Se asignó un nuevo horario a tu cita.',                         clase: 'mc-estado-simple--warning'   },
    };
    return mapa[estado] ?? mapa['confirmada'];
  }

  // ── Timeline dinámico para solicitudes de invitado ────────
  get pasos(): PasoTimeline[] {
    const estado = this.cita?.estado_cita ?? 'pendiente';

    if (estado === 'cancelada') {
      return [
        { label: 'Solicitud enviada', sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Cancelada',         sublabel: 'La solicitud fue cancelada',                     estado: 'cancelado'  },
      ];
    }

    if (estado === 'completada') {
      return [
        { label: 'Solicitud enviada', sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Revisada',          sublabel: 'Revisada por el equipo',                         estado: 'completado' },
        { label: 'Hora asignada',     sublabel: 'Hora confirmada',                                estado: 'completado' },
        { label: 'Atención realizada',sublabel: 'Consulta completada',                            estado: 'completado' },
      ];
    }

    if (estado === 'confirmada') {
      return [
        { label: 'Solicitud enviada', sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Revisada',          sublabel: 'Revisada por el equipo',                         estado: 'completado' },
        { label: 'Hora asignada',     sublabel: this.formatFecha(this.cita!.fecha_cita),          estado: 'activo'     },
        { label: 'Atención médica',   sublabel: 'Pendiente de atención',                          estado: 'pendiente'  },
      ];
    }

    if (estado === 'reprogramada') {
      return [
        { label: 'Solicitud enviada', sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
        { label: 'Revisada',          sublabel: 'Revisada por el equipo',                         estado: 'completado' },
        { label: 'Reprogramada',      sublabel: 'Se asignó un nuevo horario',                     estado: 'activo'     },
        { label: 'Atención médica',   sublabel: 'Pendiente de confirmación',                      estado: 'pendiente'  },
      ];
    }

    // pendiente — en revisión por el equipo
    return [
      { label: 'Solicitud enviada',    sublabel: this.formatFechaCorta(this.cita!.fecha_creacion), estado: 'completado' },
      { label: 'En revisión',          sublabel: 'Nuestro equipo la está revisando',               estado: 'activo'     },
      { label: 'Confirmación de hora', sublabel: 'Pendiente de asignación',                        estado: 'pendiente'  },
      { label: 'Atención médica',      sublabel: 'Pendiente de atención',                          estado: 'pendiente'  },
    ];
  }

  /** Determina si la cita puede ser cancelada o reagendada */
  get puedeModificar(): boolean {
    return ['pendiente', 'confirmada'].includes(this.cita?.estado_cita ?? '');
  }

  get chipEstado(): { label: string; clase: string } {
    const estado = this.cita?.estado_cita ?? 'pendiente';
    const esDirect = this.esCitaDirecta;
    const mapa: Record<string, { label: string; clase: string }> = {
      // Para citas directas 'pendiente' se muestra como 'Confirmada' (el slot ya está bloqueado)
      pendiente:     esDirect
                       ? { label: 'Confirmada',    clase: 'mc-chip--success'    }
                       : { label: 'En revisión',   clase: 'mc-chip--warning'    },
      confirmada:    { label: 'Confirmada',    clase: 'mc-chip--success'    },
      cancelada:     { label: 'Cancelada',     clase: 'mc-chip--error'      },
      reprogramada:  { label: 'Reprogramada',  clase: 'mc-chip--secondary'  },
      completada:    { label: 'Completada',    clase: 'mc-chip--primary'    },
    };
    return mapa[estado] ?? mapa['pendiente'];
  }

  // ── Acciones ──────────────────────────────────────────

  async confirmarCancelar(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: McAlertComponent,
      cssClass: 'mc-alert-modal',
      componentProps: {
        titulo: 'Cancelar cita',
        mensaje: '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.',
        btnConfirmar: 'Sí, cancelar',
        colorConfirmar: 'danger',
        icono: 'cancel'
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.confirmado) {
      this.cancelar();
    }
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
