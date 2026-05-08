import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  AdminService,
  EspecialidadItem as EspecialidadApiItem,
  EspecialidadPayload,
} from '../../../../core/services/admin.service';

type EspecialidadEstado = 'activa' | 'inactiva';
type ColorVariant = 'primary' | 'secondary' | 'tertiary' | 'error';

interface EspecialidadVista {
  id_especialidad: number;
  nombre: string;
  descripcion: string;
  estado: EspecialidadEstado;
  icono: string;
  totalMedicos: number;
  colorVariant: ColorVariant;
}

@Component({
  selector: 'app-especialidades',
  templateUrl: './especialidades.page.html',
  styleUrls:   ['./especialidades.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class EspecialidadesPage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  especialidades: EspecialidadVista[] = [];
  terminoBusqueda = '';
  isLoading = false;
  guardando = false;
  feedbackMessage = '';

  formVisible = false;
  editandoId: number | null = null;
  formNombre = '';
  formDescripcion = '';
  formError = '';

  // ── Estadísticas de cabecera ──────────────────────────────────────────────
  get totalActivas(): number {
    return this.especialidades.filter((e) => e.estado === 'activa').length;
  }

  get totalProfesionales(): number {
    return this.especialidades.reduce((acc, e) => acc + e.totalMedicos, 0);
  }

  get especialidadesFiltradas(): EspecialidadVista[] {
    const t = this.terminoBusqueda.toLowerCase().trim();
    if (!t) { return this.especialidades; }
    return this.especialidades.filter(
      (e) =>
        e.nombre.toLowerCase().includes(t) ||
        e.descripcion.toLowerCase().includes(t),
    );
  }

  get formTitulo(): string {
    return this.editandoId ? 'Editar especialidad' : 'Nueva especialidad';
  }

  get submitTexto(): string {
    return this.editandoId ? 'Guardar cambios' : 'Crear especialidad';
  }

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  editarEspecialidad(id: number): void {
    const especialidad = this.especialidades.find((item) => item.id_especialidad === id);
    if (!especialidad) { return; }

    this.editandoId = id;
    this.formNombre = especialidad.nombre;
    this.formDescripcion = especialidad.descripcion === 'Sin descripción registrada.'
      ? ''
      : especialidad.descripcion;
    this.formError = '';
    this.feedbackMessage = '';
    this.formVisible = true;
  }

  cambiarEstado(esp: EspecialidadVista): void {
    if (this.guardando) { return; }

    const nuevoEstado: EspecialidadEstado = esp.estado === 'activa' ? 'inactiva' : 'activa';
    this.guardando = true;
    this.feedbackMessage = '';

    this.adminService.cambiarEstadoEspecialidad(esp.id_especialidad, nuevoEstado).subscribe({
      next: (actualizada) => {
        this.actualizarLista(actualizada);
        this.feedbackMessage = nuevoEstado === 'activa'
          ? 'Especialidad activada correctamente.'
          : 'Especialidad desactivada correctamente.';
        this.guardando = false;
      },
      error: (error: unknown) => {
        this.feedbackMessage = this.mensajeError(error, 'No fue posible cambiar el estado de la especialidad.');
        this.guardando = false;
      },
    });
  }

  agregarEspecialidad(): void {
    this.editandoId = null;
    this.formNombre = '';
    this.formDescripcion = '';
    this.formError = '';
    this.feedbackMessage = '';
    this.formVisible = true;
  }

  cancelarFormulario(): void {
    this.formVisible = false;
    this.editandoId = null;
    this.formNombre = '';
    this.formDescripcion = '';
    this.formError = '';
  }

  guardarEspecialidad(): void {
    if (this.guardando) { return; }

    const nombre = this.formNombre.trim();
    const descripcion = this.formDescripcion.trim();

    if (nombre.length < 2) {
      this.formError = 'Ingresa un nombre de al menos 2 caracteres.';
      return;
    }
    if (descripcion.length > 255) {
      this.formError = 'La descripción no puede superar 255 caracteres.';
      return;
    }

    const editando = this.editandoId !== null;
    const id = this.editandoId;
    const payload: EspecialidadPayload = {
      nombre_especialidad: nombre,
      descripcion: descripcion || null,
    };

    this.guardando = true;
    this.formError = '';
    this.feedbackMessage = '';

    const request$ = editando && id !== null
      ? this.adminService.actualizarEspecialidad(id, payload)
      : this.adminService.crearEspecialidad(payload);

    request$.subscribe({
      next: (especialidad) => {
        this.actualizarLista(especialidad);
        this.cancelarFormulario();
        this.feedbackMessage = editando
          ? 'Especialidad actualizada correctamente.'
          : 'Especialidad creada correctamente.';
        this.guardando = false;
      },
      error: (error: unknown) => {
        this.formError = this.mensajeError(error, 'No fue posible guardar la especialidad.');
        this.guardando = false;
      },
    });
  }

  volverOperacion(): void {
    this.router.navigate(['/admin/operacion']);
  }

  private cargarEspecialidades(): void {
    this.isLoading = true;
    this.feedbackMessage = '';

    this.adminService.getEspecialidades().subscribe({
      next: (especialidades) => {
        this.especialidades = especialidades.map((item) => this.mapEspecialidad(item));
        this.ordenarEspecialidades();
        this.isLoading = false;
      },
      error: (error: unknown) => {
        this.feedbackMessage = this.mensajeError(error, 'No fue posible cargar las especialidades.');
        this.isLoading = false;
      },
    });
  }

  private actualizarLista(especialidad: EspecialidadApiItem): void {
    const vista = this.mapEspecialidad(especialidad);
    this.especialidades = [
      ...this.especialidades.filter((item) => item.id_especialidad !== vista.id_especialidad),
      vista,
    ];
    this.ordenarEspecialidades();
  }

  private ordenarEspecialidades(): void {
    this.especialidades = [...this.especialidades].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  private mapEspecialidad(especialidad: EspecialidadApiItem): EspecialidadVista {
    const nombre = especialidad.nombre_especialidad;

    return {
      id_especialidad: especialidad.id_especialidad,
      nombre,
      descripcion: especialidad.descripcion?.trim() || 'Sin descripción registrada.',
      estado: especialidad.estado,
      icono: this.iconoPara(nombre, especialidad.id_especialidad),
      totalMedicos: Number(especialidad.total_medicos) || 0,
      colorVariant: this.colorPara(especialidad.id_especialidad),
    };
  }

  private iconoPara(nombre: string, id: number): string {
    const normalizado = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalizado.includes('cardio')) { return 'cardiology'; }
    if (normalizado.includes('pedi')) { return 'child_care'; }
    if (normalizado.includes('neuro')) { return 'neurology'; }
    if (normalizado.includes('derma')) { return 'dermatology'; }
    if (normalizado.includes('oftal') || normalizado.includes('vision')) { return 'visibility'; }
    if (normalizado.includes('onco')) { return 'oncology'; }
    if (normalizado.includes('trauma') || normalizado.includes('ortop')) { return 'orthopedics'; }
    if (normalizado.includes('uro')) { return 'urology'; }
    if (normalizado.includes('psiq') || normalizado.includes('psico')) { return 'psychology'; }

    const iconos = ['medical_services', 'stethoscope', 'healing', 'biotech'];
    return iconos[id % iconos.length];
  }

  private colorPara(id: number): ColorVariant {
    const colores: ColorVariant[] = ['primary', 'secondary', 'tertiary', 'error'];
    return colores[id % colores.length];
  }

  private mensajeError(error: unknown, fallback: string): string {
    const response = error as { error?: { message?: string } };
    return response.error?.message ?? fallback;
  }
}
