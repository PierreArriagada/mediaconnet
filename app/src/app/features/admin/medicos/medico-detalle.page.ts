import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminService,
  MedicoDetalle,
  CitaHistorialItem,
  EspecialidadItem,
  EstadoLaboral,
  EditarPerfilPayload,
} from '../../../core/services/admin.service';
import {
  formatFechaCompleta,
  formatFechaDiaMesAnio,
  formatHoraCorta,
} from '../../../shared/utils/fecha.utils';

type TabActiva = 'perfil' | 'estado' | 'historial';

interface CambioEstadoConfig {
  nuevo_estado: EstadoLaboral;
  label: string;
  descripcion: string;
  clase: string;
  requiereConfirmacion: boolean;
}

@Component({
  selector: 'app-medico-detalle',
  templateUrl: './medico-detalle.page.html',
  styleUrls: ['./medico-detalle.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class MedicoDetallePage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  idMedico = 0;
  medico: MedicoDetalle | null = null;
  historialCitas: CitaHistorialItem[] = [];
  especialidades: EspecialidadItem[] = [];

  cargando   = false;
  errorCarga = '';

  tabActiva: TabActiva = 'perfil';

  // ── Pestaña Perfil ───────────────────────────────────────────────────────────
  editando          = false;
  guardandoPerfil   = false;
  errorPerfil       = '';
  successPerfil     = '';

  editNombre          = '';
  editApellido        = '';
  editCorreo          = '';
  editTelefono        = '';
  editIdEspecialidad: number | null = null;
  editNumeroRegistro  = '';
  editAnios           = 0;
  editBiografia       = '';

  // ── Pestaña Estado laboral ───────────────────────────────────────────────────
  nuevoEstadoSeleccionado: EstadoLaboral | null = null;
  motivoCambio         = '';
  aplicandoEstado      = false;
  errorEstado          = '';
  successEstado        = '';
  mostrarConfirmacion  = false;

  readonly transicionesDisponibles: CambioEstadoConfig[] = [
    {
      nuevo_estado: 'activo',
      label: 'Reincorporar / Activar',
      descripcion: 'El médico vuelve a estar activo en el sistema. Se reactiva su acceso.',
      clase: 'estado-btn--activo',
      requiereConfirmacion: false,
    },
    {
      nuevo_estado: 'vacaciones',
      label: 'Enviar a vacaciones',
      descripcion: 'El médico no recibirá nuevas citas mientras esté en vacaciones.',
      clase: 'estado-btn--vacaciones',
      requiereConfirmacion: false,
    },
    {
      nuevo_estado: 'licencia_medica',
      label: 'Licencia médica',
      descripcion: 'El médico queda en licencia por salud. No recibirá citas nuevas.',
      clase: 'estado-btn--licencia',
      requiereConfirmacion: false,
    },
    {
      nuevo_estado: 'licencia_administrativa',
      label: 'Licencia administrativa',
      descripcion: 'El médico queda en licencia por trámites administrativos.',
      clase: 'estado-btn--licencia',
      requiereConfirmacion: false,
    },
    {
      nuevo_estado: 'inactivo',
      label: 'Desactivar',
      descripcion: 'El médico queda inactivo. Su cuenta permanece pero no puede operar.',
      clase: 'estado-btn--inactivo',
      requiereConfirmacion: true,
    },
    {
      nuevo_estado: 'destituido',
      label: 'Destituir',
      descripcion: 'El médico es destituido. Su cuenta queda bloqueada inmediatamente.',
      clase: 'estado-btn--destituido',
      requiereConfirmacion: true,
    },
  ];

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.idMedico = parseInt(this.route.snapshot.paramMap.get('id') ?? '0', 10);
    if (this.idMedico < 1) {
      this.router.navigate(['/admin/medicos']);
      return;
    }

    this.adminService.getEspecialidades().subscribe({
      next: (esp) => (this.especialidades = esp.filter((e) => e.estado === 'activa')),
    });

    this.cargarDetalle();
  }

  cargarDetalle(): void {
    this.cargando   = true;
    this.errorCarga = '';

    this.adminService.getMedicoDetalle(this.idMedico).subscribe({
      next: ({ medico, historial_citas }) => {
        this.medico        = medico;
        this.historialCitas = historial_citas;
        this.inicializarFormulario(medico);
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = 'No se pudo cargar la información del médico.';
        this.cargando = false;
      },
    });
  }

  private inicializarFormulario(m: MedicoDetalle): void {
    this.editNombre         = m.nombre;
    this.editApellido       = m.apellido;
    this.editCorreo         = m.correo;
    this.editTelefono       = m.telefono ?? '';
    this.editIdEspecialidad = m.id_especialidad;
    this.editNumeroRegistro = m.numero_registro;
    this.editAnios          = m.anios_experiencia;
    this.editBiografia      = m.biografia ?? '';
  }

  volver(): void {
    this.router.navigate(['/admin/medicos']);
  }

  setTab(tab: TabActiva): void {
    this.tabActiva = tab;
    this.errorPerfil  = '';
    this.successPerfil = '';
    this.errorEstado  = '';
    this.successEstado = '';
  }

  // ── Edición de perfil ────────────────────────────────────────────────────────

  toggleEditar(): void {
    this.editando = !this.editando;
    this.errorPerfil = '';
    this.successPerfil = '';
    if (!this.editando && this.medico) {
      this.inicializarFormulario(this.medico);
    }
  }

  esPerfilValido(): boolean {
    return !!(
      this.editNombre.trim() &&
      this.editApellido.trim() &&
      this.editCorreo.trim() &&
      this.editIdEspecialidad &&
      this.editNumeroRegistro.trim()
    );
  }

  guardarPerfil(): void {
    if (!this.esPerfilValido()) {
      this.errorPerfil = 'Completa todos los campos obligatorios.';
      return;
    }

    this.guardandoPerfil = true;
    this.errorPerfil     = '';
    this.successPerfil   = '';

    const payload: EditarPerfilPayload = {
      nombre:           this.editNombre.trim(),
      apellido:         this.editApellido.trim(),
      correo:           this.editCorreo.trim(),
      telefono:         this.editTelefono.trim() || undefined,
      id_especialidad:  this.editIdEspecialidad!,
      numero_registro:  this.editNumeroRegistro.trim(),
      anios_experiencia: this.editAnios,
      biografia:        this.editBiografia.trim() || undefined,
    };

    this.adminService.editarPerfil(this.idMedico, payload).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        this.successPerfil   = 'Perfil actualizado correctamente.';
        this.editando        = false;
        this.cargarDetalle();
      },
      error: (err) => {
        this.guardandoPerfil = false;
        this.errorPerfil = err?.error?.message ?? 'Error al actualizar el perfil.';
      },
    });
  }

  // ── Cambio de estado laboral ─────────────────────────────────────────────────

  transicionesAplicables(): CambioEstadoConfig[] {
    if (!this.medico) return [];
    return this.transicionesDisponibles.filter(
      (t) => t.nuevo_estado !== this.medico!.estado_laboral,
    );
  }

  seleccionarTransicion(cfg: CambioEstadoConfig): void {
    this.nuevoEstadoSeleccionado = cfg.nuevo_estado;
    this.motivoCambio = '';
    this.errorEstado  = '';
    this.successEstado = '';
    this.mostrarConfirmacion = cfg.requiereConfirmacion;
  }

  cancelarTransicion(): void {
    this.nuevoEstadoSeleccionado = null;
    this.motivoCambio = '';
    this.mostrarConfirmacion = false;
  }

  aplicarCambioEstado(): void {
    if (!this.nuevoEstadoSeleccionado) return;

    this.aplicandoEstado = true;
    this.errorEstado     = '';
    this.successEstado   = '';

    this.adminService
      .cambiarEstadoLaboral(this.idMedico, this.nuevoEstadoSeleccionado, this.motivoCambio || undefined)
      .subscribe({
        next: (res) => {
          this.aplicandoEstado         = false;
          this.successEstado           = `Estado actualizado a "${this.labelEstado(res.nuevo_estado)}" correctamente.`;
          this.nuevoEstadoSeleccionado  = null;
          this.motivoCambio            = '';
          this.mostrarConfirmacion     = false;
          this.cargarDetalle();
        },
        error: (err) => {
          this.aplicandoEstado = false;
          this.errorEstado = err?.error?.message ?? 'Error al cambiar el estado laboral.';
        },
      });
  }

  // ── Helpers de presentación ──────────────────────────────────────────────────

  labelEstado(estado: EstadoLaboral): string {
    const mapa: Record<EstadoLaboral, string> = {
      activo:                  'Activo',
      vacaciones:              'Vacaciones',
      licencia_medica:         'Licencia médica',
      licencia_administrativa: 'Licencia administrativa',
      inactivo:                'Inactivo',
      destituido:              'Destituido',
    };
    return mapa[estado] ?? estado;
  }

  claseEstado(estado: EstadoLaboral): string {
    const mapa: Record<EstadoLaboral, string> = {
      activo:                  'badge--activo',
      vacaciones:              'badge--vacaciones',
      licencia_medica:         'badge--licencia',
      licencia_administrativa: 'badge--licencia',
      inactivo:                'badge--inactivo',
      destituido:              'badge--destituido',
    };
    return mapa[estado] ?? '';
  }

  formatFecha(fecha: string | null | undefined): string {
    return formatFechaCompleta(fecha);
  }

  formatFechaCita(fecha: string | null | undefined): string {
    return formatFechaDiaMesAnio(fecha);
  }

  formatHora(hora: string | null | undefined): string {
    return formatHoraCorta(hora);
  }

  labelEstadoCita(estado: string): string {
    const mapa: Record<string, string> = {
      confirmada:   'Confirmada',
      pendiente:    'Pendiente',
      completada:   'Completada',
      cancelada:    'Cancelada',
      reprogramada: 'Reprogramada',
    };
    return mapa[estado] ?? estado;
  }

  claseCita(estado: string): string {
    if (estado === 'confirmada')   return 'cita-badge--confirmada';
    if (estado === 'completada')   return 'cita-badge--completada';
    if (estado === 'pendiente')    return 'cita-badge--pendiente';
    if (estado === 'cancelada')    return 'cita-badge--cancelada';
    if (estado === 'reprogramada') return 'cita-badge--pendiente';
    return '';
  }

  irHorarios(): void {
    this.router.navigate(['/admin/operacion/horarios']);
  }
}
