import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  AdminService,
  MedicoGestionItem,
  EstadoLaboral,
  EspecialidadItem,
  FiltrosMedicosGestion,
} from '../../../core/services/admin.service';
import { formatFechaCompleta } from '../../../shared/utils/fecha.utils';

interface BadgeInfo {
  label: string;
  clase: string;
}

@Component({
  selector: 'app-medicos-list',
  templateUrl: './medicos-list.page.html',
  styleUrls: ['./medicos-list.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class MedicosListPage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  medicos: MedicoGestionItem[] = [];
  especialidades: EspecialidadItem[] = [];
  cargando = false;
  error = '';

  // Filtros
  filtroBusqueda = '';
  filtroEspecialidad = '';
  filtroEstadoLaboral: EstadoLaboral | '' = '';

  readonly estadosLaborales: { value: EstadoLaboral | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'activo', label: 'Activo' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'licencia_medica', label: 'Licencia médica' },
    { value: 'licencia_administrativa', label: 'Licencia administrativa' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'destituido', label: 'Destituido' },
  ];

  ngOnInit(): void {
    this.cargarEspecialidades();
    this.cargarMedicos();
  }

  cargarEspecialidades(): void {
    this.adminService.getEspecialidades().subscribe({
      next: (esp) => (this.especialidades = esp),
      error: () => {},
    });
  }

  cargarMedicos(): void {
    this.cargando = true;
    this.error = '';

    const filtros: FiltrosMedicosGestion = {};
    if (this.filtroBusqueda.trim())  filtros.q = this.filtroBusqueda.trim();
    if (this.filtroEspecialidad)     filtros.especialidad = this.filtroEspecialidad;
    if (this.filtroEstadoLaboral)    filtros.estado_laboral = this.filtroEstadoLaboral;

    this.adminService.getMedicosGestion(filtros).subscribe({
      next: (medicos) => {
        this.medicos = medicos;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de médicos.';
        this.cargando = false;
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroBusqueda     = '';
    this.filtroEspecialidad = '';
    this.filtroEstadoLaboral = '';
    this.cargarMedicos();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/admin/medicos', id]);
  }

  irANuevoMedico(): void {
    this.router.navigate(['/admin/medicos/nuevo']);
  }

  badgeEstadoLaboral(estado: EstadoLaboral): BadgeInfo {
    const mapa: Record<EstadoLaboral, BadgeInfo> = {
      activo:                  { label: 'Activo',                  clase: 'badge--activo' },
      vacaciones:              { label: 'Vacaciones',              clase: 'badge--vacaciones' },
      licencia_medica:         { label: 'Lic. médica',             clase: 'badge--licencia' },
      licencia_administrativa: { label: 'Lic. admin.',             clase: 'badge--licencia' },
      inactivo:                { label: 'Inactivo',                clase: 'badge--inactivo' },
      destituido:              { label: 'Destituido',              clase: 'badge--destituido' },
    };
    return mapa[estado] ?? { label: estado, clase: '' };
  }

  formatFecha(fecha: string | null | undefined): string {
    return formatFechaCompleta(fecha);
  }

  trackByMedico(_: number, m: MedicoGestionItem): number {
    return m.id_medico;
  }
}
