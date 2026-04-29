import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  CitaMedico,
  CitasMedicoData,
  MedicoService,
} from '../../../core/services/medico.service';

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    MedicoBottomNavComponent,
    MedicoHeaderComponent
  ]
})
export class AgendaPage implements OnInit {
  private readonly router = inject(Router);
  private readonly medicoService = inject(MedicoService);
  private readonly authService = inject(AuthService);

  user = this.authService.getCurrentUser();
  citasHoy: CitaMedico[] = [];
  citasProximas: CitaMedico[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit() {
    this.cargarAgenda();
  }

  // Edu: carga agenda médica combinando citas pendientes de asistencia y próximas citas.
  cargarAgenda() {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getCitasParaMarcar().subscribe({
      next: (data: CitasMedicoData) => {
        this.citasHoy = data.citas ?? [];
        this.cargarCitasProximas();
      },
      error: () => {
        this.citasHoy = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar la agenda médica.';
      }
    });
  }

  // Edu: carga las próximas citas del profesional autenticado.
  private cargarCitasProximas() {
    this.medicoService.getCitasProximas().subscribe({
      next: (data: CitasMedicoData) => {
        this.citasProximas = data.citas ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.citasProximas = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar las próximas citas.';
      }
    });
  }

  // Edu: permite refrescar manualmente la agenda desde la vista.
  refrescarAgenda() {
    this.cargarAgenda();
  }

  // Edu: acceso directo a ficha clínica desde una cita de la agenda.
  verFichaPaciente(idPaciente?: number) {
    if (!idPaciente) {
      return;
    }

    this.router.navigate(['/medico/pacientes', idPaciente, 'ficha']);
  }
}
