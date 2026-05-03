import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminService,
  PacienteDetalle,
  CitaPacienteItem,
} from '../../../core/services/admin.service';
import {
  formatFechaDiaMesAnio,
  formatHoraCorta,
} from '../../../shared/utils/fecha.utils';

type TabActiva = 'ficha' | 'citas';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class PacienteDetallePage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  idPaciente = 0;
  paciente: PacienteDetalle | null = null;
  citas: CitaPacienteItem[]        = [];

  cargando   = false;
  errorCarga = '';

  tabActiva: TabActiva = 'ficha';

  ngOnInit(): void {
    this.idPaciente = parseInt(this.route.snapshot.paramMap.get('id') ?? '0', 10);
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'citas') { this.tabActiva = 'citas'; }
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (!this.idPaciente) { return; }
    this.cargando = true;
    this.errorCarga = '';

    this.adminService.getPacienteDetalle(this.idPaciente).subscribe({
      next: (res) => {
        this.paciente = res.paciente;
        this.citas    = res.citas;
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = 'No se pudo cargar la ficha del paciente.';
        this.cargando   = false;
      },
    });
  }

  setTab(tab: TabActiva): void {
    this.tabActiva = tab;
  }

  volver(): void {
    this.router.navigate(['/admin/pacientes']);
  }

  verCita(idCita: number): void {
    this.router.navigate(['/admin/pacientes', this.idPaciente, 'citas', idCita]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatFecha(f: string | null | undefined): string {
    return formatFechaDiaMesAnio(f);
  }

  formatHora(h: string | null | undefined): string {
    return formatHoraCorta(h);
  }

  formatDia(fecha: string | null | undefined): string {
    if (!fecha) { return '—'; }
    const d = new Date(fecha + 'T12:00:00');
    return d.getDate().toString().padStart(2, '0');
  }

  formatMes(fecha: string | null | undefined): string {
    if (!fecha) { return ''; }
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleString('es-CL', { month: 'short' }).replace('.', '');
  }

  calcularEdad(fechaNacimiento: string | null | undefined): string {
    if (!fechaNacimiento) { return '—'; }
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) { edad--; }
    return `${edad} años`;
  }

  claseCuenta(estado: string): string {
    const mapa: Record<string, string> = {
      activo:    'badge--activo',
      inactivo:  'badge--inactivo',
      bloqueado: 'badge--bloqueado',
    };
    return mapa[estado] ?? 'badge--inactivo';
  }

  labelCuenta(estado: string): string {
    const mapa: Record<string, string> = {
      activo:    'Activo',
      inactivo:  'Inactivo',
      bloqueado: 'Bloqueado',
    };
    return mapa[estado] ?? estado;
  }

  claseCita(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente:     'cita-badge--pendiente',
      confirmada:    'cita-badge--confirmada',
      completada:    'cita-badge--completada',
      cancelada:     'cita-badge--cancelada',
      reprogramada:  'cita-badge--reprogramada',
    };
    return mapa[estado] ?? 'cita-badge--pendiente';
  }

  labelCita(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente:    'Pendiente',
      confirmada:   'Confirmada',
      completada:   'Completada',
      cancelada:    'Cancelada',
      reprogramada: 'Reprogramada',
    };
    return mapa[estado] ?? estado;
  }

  get citasFuturas(): CitaPacienteItem[] {
    const hoy = new Date().toISOString().split('T')[0];
    return this.citas.filter(
      (c) => c.fecha_cita >= hoy && c.estado !== 'cancelada',
    );
  }

  get citasPasadas(): CitaPacienteItem[] {
    const hoy = new Date().toISOString().split('T')[0];
    return this.citas.filter(
      (c) => c.fecha_cita < hoy || c.estado === 'completada' || c.estado === 'cancelada',
    );
  }
}
