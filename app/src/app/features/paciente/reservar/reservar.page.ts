import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  PacienteService,
  Especialidad,
} from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';

// Configuración visual estática por especialidad (icono + tema de color CSS)
const MAPA_VISUAL: Record<string, { icono: string; tema: string }> = {
  'Cardiología':      { icono: 'favorite',          tema: 'error'         },
  'Dermatología':     { icono: 'dry_cleaning',       tema: 'primary-fixed' },
  'Medicina General': { icono: 'medical_services',   tema: 'primary'       },
  'Pediatría':        { icono: 'child_care',          tema: 'tertiary'      },
  'Traumatología':    { icono: 'orthopedics',         tema: 'secondary'     },
};

@Component({
  selector: 'app-reservar',
  templateUrl: './reservar.page.html',
  styleUrls:   ['./reservar.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonContent, IonToast,
    PacienteBottomNavComponent,
    PacienteHeaderComponent,
  ],
})
export class ReservarPage implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly svc    = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  user          = this.auth.getCurrentUser();
  especialidades: Especialidad[] = [];
  noLeidas      = 0;
  isLoading     = true;
  errorMsg      = '';
  showError     = false;
  busqueda      = '';

  get firstName(): string {
    return this.user?.name?.split(' ')[0] ?? '';
  }

  /** Filtra en cliente por nombre o descripción sin llamadas extra al servidor */
  get especialidadesFiltradas(): Especialidad[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.especialidades;
    return this.especialidades.filter(
      (e) =>
        e.nombre_especialidad.toLowerCase().includes(q) ||
        e.descripcion?.toLowerCase().includes(q),
    );
  }

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  cargarEspecialidades(): void {
    this.isLoading = true;
    this.svc.getEspecialidades().subscribe({
      next: ({ especialidades, noLeidas }) => {
        this.especialidades = especialidades;
        this.noLeidas       = noLeidas;
        this.notificacionesState.setNoLeidas(noLeidas);
        this.isLoading      = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Error al cargar especialidades.';
        this.showError = true;
      },
    });
  }

  icono(nombre: string): string {
    return MAPA_VISUAL[nombre]?.icono ?? 'local_hospital';
  }

  tema(nombre: string): string {
    return MAPA_VISUAL[nombre]?.tema ?? 'primary';
  }

  /** Navega a la lista de profesionales de la especialidad seleccionada */
  verProfesionales(id: number): void {
    this.router.navigate(['/paciente', 'profesionales', id]);
  }
}
