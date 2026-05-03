import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  esHoy,
  formatFechaCorta,
  formatFechaDiaMesAnio,
} from '../../../../shared/utils/fecha.utils';

/** Médico resumido para el selector de la vista */
interface MedicoItem {
  id_medico: number;
  nombre: string;
  apellido: string;
  especialidad: string;
}

/** Bloque de disponibilidad que devuelve el backend */
interface BloqueDisponibilidad {
  id_disponibilidad: number;
  fecha: string;       // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string;    // HH:MM
  estado: 'disponible' | 'reservada' | 'bloqueada';
  nota?: string;
}

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.page.html',
  styleUrls:   ['./horarios.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class HorariosPage implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  user = this.auth.getCurrentUser();

  // ── Estado del selector de médico ──────────────────────────────────────────
  medicos: MedicoItem[] = [];
  medicoSeleccionadoId: number | null = null;
  terminoBusqueda = '';

  // ── Estado de disponibilidad del médico seleccionado ───────────────────────
  bloques: BloqueDisponibilidad[] = [];
  isLoading = false;
  errorMessage = '';

  // ── Fecha de referencia para la semana visualizada ─────────────────────────
  fechaReferencia = this.toISODate(new Date());

  ngOnInit(): void {
    // Datos stub hasta que se conecte /api/admin
    this.medicos = [
      { id_medico: 1, nombre: 'María', apellido: 'González', especialidad: 'Cardiología' },
      { id_medico: 2, nombre: 'Carlos', apellido: 'Rojas',   especialidad: 'Neurología'  },
      { id_medico: 3, nombre: 'Ana',    apellido: 'Muñoz',   especialidad: 'Pediatría'   },
    ];
  }

  get medicosFiltrados(): MedicoItem[] {
    const t = this.terminoBusqueda.toLowerCase().trim();
    if (!t) { return this.medicos; }
    return this.medicos.filter(
      (m) =>
        m.nombre.toLowerCase().includes(t) ||
        m.apellido.toLowerCase().includes(t) ||
        m.especialidad.toLowerCase().includes(t),
    );
  }

  get medicoActual(): MedicoItem | undefined {
    return this.medicos.find((m) => m.id_medico === this.medicoSeleccionadoId);
  }

  seleccionarMedico(id: number): void {
    this.medicoSeleccionadoId = id;
    this.terminoBusqueda = '';
    // TODO: cargar disponibilidad real vía AdminService
    this.bloques = [];
  }

  get semanaEtiqueta(): string {
    const inicio = this.inicioSemana(this.parseISODate(this.fechaReferencia));
    const fin    = this.sumarDias(inicio, 6);
    return `${formatFechaCorta(this.toISODate(inicio))} — ${formatFechaDiaMesAnio(this.toISODate(fin))}`;
  }

  get diasSemana(): Array<{ iso: string; etiqueta: string; numeroDia: string; esHoy: boolean }> {
    const inicio = this.inicioSemana(this.parseISODate(this.fechaReferencia));
    return Array.from({ length: 7 }, (_, i) => {
      const d   = this.sumarDias(inicio, i);
      const iso = this.toISODate(d);
      return {
        iso,
        etiqueta:  d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '').toUpperCase(),
        numeroDia: d.toLocaleDateString('es-CL', { day: '2-digit' }),
        esHoy:     esHoy(iso),
      };
    });
  }

  bloquesDelDia(iso: string): BloqueDisponibilidad[] {
    return this.bloques.filter((b) => b.fecha === iso);
  }

  semanaAnterior(): void {
    const d = this.parseISODate(this.fechaReferencia);
    d.setDate(d.getDate() - 7);
    this.fechaReferencia = this.toISODate(d);
  }

  semanaSiguiente(): void {
    const d = this.parseISODate(this.fechaReferencia);
    d.setDate(d.getDate() + 7);
    this.fechaReferencia = this.toISODate(d);
  }

  volverOperacion(): void {
    this.router.navigate(['/admin/operacion']);
  }

  // ── Helpers de fecha ────────────────────────────────────────────────────────

  private toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private parseISODate(iso: string): Date {
    const [y, m, day] = iso.split('-').map(Number);
    return new Date(y, m - 1, day);
  }

  private inicioSemana(d: Date): Date {
    const c = new Date(d);
    const dow = c.getDay();
    const diff = dow === 0 ? -6 : 1 - dow; // lunes como primer día
    c.setDate(c.getDate() + diff);
    return c;
  }

  private sumarDias(d: Date, n: number): Date {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  }

  etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      disponible: 'Disponible',
      reservada:  'Reservada',
      bloqueada:  'Bloqueada',
    };
    return map[estado] ?? estado;
  }
}
