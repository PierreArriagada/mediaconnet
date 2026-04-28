import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { FichaPacienteData, MedicoService } from '../../../core/services/medico.service';

@Component({
  selector: 'app-fichapacientes',
  templateUrl: './fichapacientes.page.html',
  styleUrls: ['./fichapacientes.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class FichapacientesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medicoService = inject(MedicoService);

  ficha: FichaPacienteData | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit() {
    this.cargarFichaPaciente();
  }

  // Edu: carga la ficha clínica del paciente usando el id recibido por ruta.
  cargarFichaPaciente() {
    const idPaciente = Number(this.route.snapshot.paramMap.get('id'));

    if (!idPaciente || Number.isNaN(idPaciente)) {
      this.isLoading = false;
      this.errorMessage = 'No se pudo identificar al paciente solicitado.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getFichaPaciente(idPaciente).subscribe({
      // Edu: respuesta tipada desde el servicio médico para evitar tipos implícitos.
      next: (data: FichaPacienteData) => {
        this.ficha = data;
        this.isLoading = false;
      },
      error: () => {
        this.ficha = null;
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar la ficha del paciente.';
      }
    });
  }

  // Edu: vuelve al listado de pacientes del módulo médico.
  volverPacientes() {
    this.router.navigate(['/medico/pacientes']);
  }
}
