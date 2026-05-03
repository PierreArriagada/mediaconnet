import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../../core/services/auth.service';

export interface EspecialidadItem {
  id_especialidad: number;
  nombre: string;
  descripcion: string;
  estado: 'activa' | 'inactiva';
  icono: string;
  totalMedicos: number;
  colorVariant: 'primary' | 'secondary' | 'tertiary' | 'error';
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
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  user = this.auth.getCurrentUser();

  especialidades: EspecialidadItem[] = [];
  terminoBusqueda = '';
  isLoading = false;

  // ── Estadísticas de cabecera ──────────────────────────────────────────────
  get totalActivas(): number {
    return this.especialidades.filter((e) => e.estado === 'activa').length;
  }

  get totalProfesionales(): number {
    return this.especialidades.reduce((acc, e) => acc + e.totalMedicos, 0);
  }

  get especialidadesFiltradas(): EspecialidadItem[] {
    const t = this.terminoBusqueda.toLowerCase().trim();
    if (!t) { return this.especialidades; }
    return this.especialidades.filter(
      (e) =>
        e.nombre.toLowerCase().includes(t) ||
        e.descripcion.toLowerCase().includes(t),
    );
  }

  ngOnInit(): void {
    // Datos stub hasta que se conecte /api/admin/especialidades
    this.especialidades = [
      { id_especialidad: 1, nombre: 'Cardiología',    descripcion: 'Enfermedades del corazón y sistema cardiovascular', estado: 'activa',   icono: 'cardiology',    totalMedicos: 42, colorVariant: 'primary'   },
      { id_especialidad: 2, nombre: 'Pediatría',      descripcion: 'Salud integral de niños y adolescentes',           estado: 'activa',   icono: 'child_care',    totalMedicos: 38, colorVariant: 'secondary' },
      { id_especialidad: 3, nombre: 'Neurología',     descripcion: 'Sistema nervioso central y periférico',            estado: 'activa',   icono: 'neurology',     totalMedicos: 15, colorVariant: 'tertiary'  },
      { id_especialidad: 4, nombre: 'Dermatología',   descripcion: 'Enfermedades de la piel, cabello y uñas',          estado: 'activa',   icono: 'dermatology',   totalMedicos: 29, colorVariant: 'primary'   },
      { id_especialidad: 5, nombre: 'Oftalmología',   descripcion: 'Salud ocular y trastornos visuales',               estado: 'activa',   icono: 'visibility',    totalMedicos: 21, colorVariant: 'secondary' },
      { id_especialidad: 6, nombre: 'Oncología',      descripcion: 'Diagnóstico y tratamiento del cáncer',             estado: 'activa',   icono: 'oncology',      totalMedicos: 12, colorVariant: 'error'     },
      { id_especialidad: 7, nombre: 'Traumatología',  descripcion: 'Sistema musculoesquelético y traumatismos',        estado: 'activa',   icono: 'orthopedics',   totalMedicos: 33, colorVariant: 'tertiary'  },
      { id_especialidad: 8, nombre: 'Urología',       descripcion: 'Sistema urinario y reproductor masculino',         estado: 'activa',   icono: 'urology',       totalMedicos: 19, colorVariant: 'primary'   },
      { id_especialidad: 9, nombre: 'Psiquiatría',    descripcion: 'Salud mental y trastornos conductuales',           estado: 'inactiva', icono: 'psychiatry',    totalMedicos:  0, colorVariant: 'secondary' },
    ];
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  editarEspecialidad(id: number): void {
    // TODO: abrir modal o navegar a formulario de edición
    console.warn('editar especialidad', id);
  }

  cambiarEstado(esp: EspecialidadItem): void {
    // TODO: llamar a /api/admin/especialidades/:id/estado
    console.warn('cambiar estado', esp.id_especialidad);
  }

  agregarEspecialidad(): void {
    // TODO: abrir modal de alta
    console.warn('nueva especialidad');
  }

  volverOperacion(): void {
    this.router.navigate(['/admin/operacion']);
  }
}
