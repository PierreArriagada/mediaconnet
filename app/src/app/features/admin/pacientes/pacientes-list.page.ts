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
  PacienteListItem,
  FiltrosPacientes,
} from '../../../core/services/admin.service';
import { formatFechaDiaMesAnio } from '../../../shared/utils/fecha.utils';

@Component({
  selector: 'app-pacientes-list',
  templateUrl: './pacientes-list.page.html',
  styleUrls: ['./pacientes-list.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class PacientesListPage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  pacientes: PacienteListItem[] = [];
  cargando = false;
  error    = '';

  filtroBusqueda = '';
  filtroEstado   = '';

  readonly estadosCuenta = [
    { value: '',          label: 'Todos los estados' },
    { value: 'activo',    label: 'Activo' },
    { value: 'inactivo',  label: 'Inactivo' },
    { value: 'bloqueado', label: 'Bloqueado' },
  ];

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes(): void {
    this.cargando = true;
    this.error    = '';

    const filtros: FiltrosPacientes = {};
    if (this.filtroBusqueda.trim()) filtros.q      = this.filtroBusqueda.trim();
    if (this.filtroEstado)          filtros.estado = this.filtroEstado;

    this.adminService.getPacientes(filtros).subscribe({
      next: (lista) => {
        this.pacientes = lista;
        this.cargando  = false;
      },
      error: () => {
        this.error    = 'No se pudo cargar la lista de pacientes.';
        this.cargando = false;
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado   = '';
    this.cargarPacientes();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/admin/pacientes', id]);
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

  formatFecha(f: string | null | undefined): string {
    return formatFechaDiaMesAnio(f);
  }
}
