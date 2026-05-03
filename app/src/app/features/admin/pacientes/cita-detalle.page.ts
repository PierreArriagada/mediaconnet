import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminService,
  CitaAdminDetalle,
  HistorialAtencion,
} from '../../../core/services/admin.service';
import {
  formatFechaDiaMesAnio,
  formatHoraCorta,
  formatFechaConHora,
} from '../../../shared/utils/fecha.utils';

@Component({
  selector: 'app-cita-detalle',
  templateUrl: './cita-detalle.page.html',
  styleUrls: ['./cita-detalle.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class CitaDetallePage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  idPaciente = 0;
  idCita     = 0;
  cita: CitaAdminDetalle | null      = null;
  historial: HistorialAtencion | null = null;

  cargando   = false;
  errorCarga = '';

  ngOnInit(): void {
    this.idPaciente = parseInt(this.route.snapshot.paramMap.get('id') ?? '0', 10);
    this.idCita     = parseInt(this.route.snapshot.paramMap.get('idCita') ?? '0', 10);
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (!this.idCita) { return; }
    this.cargando   = true;
    this.errorCarga = '';

    this.adminService.getCitaDetalle(this.idCita).subscribe({
      next: (res) => {
        this.cita     = res.cita;
        this.historial = res.historial;
        this.cargando  = false;
      },
      error: () => {
        this.errorCarga = 'No se pudo cargar el detalle de la cita.';
        this.cargando   = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/admin/pacientes', this.idPaciente], {
      queryParams: { tab: 'citas' },
    });
  }

  irMedico(): void {
    if (this.cita) {
      this.router.navigate(['/admin/medicos', this.cita.id_medico]);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatFecha(f: string | null | undefined): string {
    return formatFechaDiaMesAnio(f);
  }

  formatHora(h: string | null | undefined): string {
    return formatHoraCorta(h);
  }

  formatFechaHora(f: string | null | undefined): string {
    return formatFechaConHora(f);
  }

  claseCita(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente:    'estado--pendiente',
      confirmada:   'estado--confirmada',
      completada:   'estado--completada',
      cancelada:    'estado--cancelada',
      reprogramada: 'estado--reprogramada',
    };
    return mapa[estado] ?? 'estado--pendiente';
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

  labelAsistencia(valor: boolean | null): string {
    if (valor === null) { return 'Sin confirmar'; }
    return valor ? 'Sí' : 'No';
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

  formatAnio(fecha: string | null | undefined): string {
    if (!fecha) { return ''; }
    const d = new Date(fecha + 'T12:00:00');
    return d.getFullYear().toString();
  }
}
