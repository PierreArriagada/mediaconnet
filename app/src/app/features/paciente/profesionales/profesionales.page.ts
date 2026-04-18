import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  PacienteService,
  MedicoProfesional,
  ProfesionalesData,
} from '../../../core/services/paciente.service';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';

// Filtros por disponibilidad — sin filtros externos para no hacer peticiones extra
type FiltroDisp = 'todos' | 'hoy' | 'semana';

@Component({
  selector: 'app-profesionales',
  templateUrl: './profesionales.page.html',
  styleUrls:   ['./profesionales.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonToast,
    PacienteBottomNavComponent,
    PacienteHeaderComponent,
  ],
})
export class ProfesionalesPage implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly svc      = inject(PacienteService);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);
  private readonly location = inject(Location);

  user      = this.auth.getCurrentUser();
  data: ProfesionalesData | null = null;
  isLoading  = true;
  errorMsg   = '';
  showError  = false;
  showProx   = false;
  filtro: FiltroDisp = 'todos';

  get noLeidas(): number { return this.data?.noLeidas ?? 0; }

  /** Filtra médicos en cliente según disponibilidad — sin petición adicional */
  get medicosFiltrados(): MedicoProfesional[] {
    const medicos = this.data?.medicos ?? [];
    if (this.filtro === 'todos') return medicos;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() + 7);

    return medicos.filter((m) =>
      m.disponibilidad.some((d) => {
        const [y, mo, dy] = d.fecha.split('-').map(Number);
        const f = new Date(y, mo - 1, dy);
        if (this.filtro === 'hoy')   return f.getTime() === hoy.getTime();
        if (this.filtro === 'semana') return f >= hoy && f <= finSemana;
        return true;
      }),
    );
  }

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('idEspecialidad'));
    // Validar parámetro antes de usarlo — previene rutas inválidas
    if (!idParam || idParam < 1 || !Number.isInteger(idParam)) {
      this.router.navigate(['/paciente', 'reservar']);
      return;
    }
    this.cargar(idParam);
  }

  private cargar(idEspecialidad: number): void {
    this.svc.getProfesionales(idEspecialidad).subscribe({
      next: (d) => {
        this.data      = d;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cargar profesionales.';
        this.showError = true;
      },
    });
  }

  volver(): void {
    this.location.back();
  }

  /** Dos iniciales del médico para el avatar */
  iniciales(nombre: string, apellido: string): string {
    return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
  }

  /** Asigna tema de avatar según id para dar variedad visual */
  temaAvatar(idMedico: number): string {
    return ['primary', 'tertiary', 'secondary'][idMedico % 3];
  }

  /** Heurística básica de título honorífico por terminación del nombre */
  titulo(nombre: string): string {
    return nombre.trim().slice(-1).toLowerCase() === 'a' ? 'Dra.' : 'Dr.';
  }

  esHoy(fecha: string): boolean {
    const [y, m, d] = fecha.split('-').map(Number);
    const hoy = new Date();
    return new Date(y, m - 1, d).toDateString() === hoy.toDateString();
  }

  /** Etiqueta del slot: "Hoy 09:00" o "mar. 15 abr. 09:00" */
  etiquetaSlot(fecha: string, horaInicio: string): string {
    const hora = horaInicio.slice(0, 5);
    if (this.esHoy(fecha)) return `Hoy ${hora}`;
    const [y, m, d] = fecha.split('-').map(Number);
    const f = new Date(y, m - 1, d);
    return (
      f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' ' + hora
    );
  }

  // Navegar al detalle del profesional con su disponibilidad completa
  verDisponibilidad(idMedico: number): void {
    this.router.navigate(['/paciente', 'detalle-profesional', idMedico]);
  }
}
