import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { finalize, forkJoin } from 'rxjs';

import { AuditLog, AuditResumen, AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';

type CategoriaFiltro = '' | AuditLog['categoria'];
type TipoAccionFiltro = '' | AuditLog['tipo_accion'];

@Component({
  selector: 'app-auditoria',
  templateUrl: './auditoria.page.html',
  styleUrls: ['./auditoria.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class AuditoriaPage implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly auth = inject(AuthService);

  readonly user = this.auth.getCurrentUser();
  readonly limit = 20;

  logs: AuditLog[] = [];
  resumen: AuditResumen | null = null;
  total = 0;
  offset = 0;
  cargando = false;
  error = '';

  filtroCategoria: CategoriaFiltro = '';
  filtroTipoAccion: TipoAccionFiltro = '';
  filtroBusqueda = '';

  readonly categorias: Array<{ value: AuditLog['categoria']; label: string }> = [
    { value: 'MEDICO', label: 'Médicos' },
    { value: 'ESPECIALIDAD', label: 'Especialidades' },
    { value: 'PACIENTE', label: 'Pacientes' },
    { value: 'CITA', label: 'Citas' },
    { value: 'SOLICITUD', label: 'Solicitudes' },
    { value: 'DISPONIBILIDAD', label: 'Disponibilidad' },
    { value: 'PERFIL_ADMIN', label: 'Perfil admin' },
    { value: 'SEGURIDAD', label: 'Seguridad' },
  ];

  readonly tiposAccion: Array<{ value: AuditLog['tipo_accion']; label: string }> = [
    { value: 'LOGIN', label: 'Inicio de sesión' },
    { value: 'CREATE', label: 'Creación' },
    { value: 'UPDATE', label: 'Actualización' },
    { value: 'DELETE', label: 'Eliminación' },
  ];

  ngOnInit(): void {
    this.cargarAuditoria();
  }

  cargarAuditoria(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      logs: this.auditService.obtenerLogs({
        categoria: this.filtroCategoria || undefined,
        tipoAccion: this.filtroTipoAccion || undefined,
        busqueda: this.filtroBusqueda.trim() || undefined,
        limit: this.limit,
        offset: this.offset,
      }),
      resumen: this.auditService.obtenerResumen(),
    })
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: ({ logs, resumen }) => {
          this.logs = logs.logs;
          this.total = logs.paginacion.total;
          this.resumen = resumen;
        },
        error: () => {
          this.logs = [];
          this.total = 0;
          this.error = 'No se pudo cargar la auditoría.';
        },
      });
  }

  aplicarFiltros(): void {
    this.offset = 0;
    this.cargarAuditoria();
  }

  limpiarFiltros(): void {
    this.filtroCategoria = '';
    this.filtroTipoAccion = '';
    this.filtroBusqueda = '';
    this.offset = 0;
    this.cargarAuditoria();
  }

  paginaAnterior(): void {
    if (this.offset === 0) return;
    this.offset = Math.max(0, this.offset - this.limit);
    this.cargarAuditoria();
  }

  paginaSiguiente(): void {
    if (this.offset + this.limit >= this.total) return;
    this.offset += this.limit;
    this.cargarAuditoria();
  }

  get paginaActual(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(fecha));
  }

  etiquetaCategoria(categoria: AuditLog['categoria']): string {
    return this.categorias.find((item) => item.value === categoria)?.label || categoria;
  }

  etiquetaAccion(accion: AuditLog['tipo_accion']): string {
    return this.tiposAccion.find((item) => item.value === accion)?.label || accion;
  }

  iconoAccion(accion: AuditLog['tipo_accion']): string {
    switch (accion) {
      case 'LOGIN':
        return 'login';
      case 'CREATE':
        return 'add_circle';
      case 'DELETE':
        return 'delete';
      default:
        return 'edit';
    }
  }

  descripcion(log: AuditLog): string {
    const entidad = log.entidad_tipo && log.entidad_id
      ? `${log.entidad_tipo} #${log.entidad_id}`
      : 'registro administrativo';

    return `${this.etiquetaAccion(log.tipo_accion)} en ${entidad}`;
  }

  trackByLog(_index: number, log: AuditLog): number | string {
    return log.id_audit_log;
  }
}
