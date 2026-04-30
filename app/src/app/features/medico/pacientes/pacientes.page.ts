import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import {
  MedicoService,
  PacienteMedico,
  PacientesMedicoData,
} from '../../../core/services/medico.service';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, MedicoHeaderComponent, MedicoBottomNavComponent]
})
export class PacientesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly medicoService = inject(MedicoService);

  user = this.authService.getCurrentUser();
  pacientes: PacienteMedico[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit() {
    this.cargarPacientes();
  }

  // Edu: obtiene listado de pacientes asociados al profesional autenticado.
  cargarPacientes() {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getPacientes().subscribe({
      next: (data: PacientesMedicoData) => {
        this.pacientes = data.pacientes ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.pacientes = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar los pacientes.';
      }
    });
  }

  // Edu: navega a la ficha clínica del paciente seleccionado.
  verFicha(idPaciente: number) {
    this.router.navigate(['/medico/pacientes', idPaciente, 'ficha']);
  }
}
