import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, CrearCitaPayload } from '../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { formatFechaLargaConDia, formatHoraCorta } from '../../../shared/utils/fecha.utils';

@Component({
  standalone: true,
  selector: 'app-confirmar-reserva',
  templateUrl: './confirmar-reserva.page.html',
  styleUrls: ['./confirmar-reserva.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonToast, PacienteHeaderComponent, PacienteBottomNavComponent],
})
export default class ConfirmarReservaPage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly svc     = inject(PacienteService);
  private readonly authSvc = inject(AuthService);

  userName = '';

  // Datos del médico y slot (vienen por queryParams)
  idDisponibilidad = 0;
  idMedico         = 0;
  idEspecialidad   = 0;
  nombreMedico     = '';
  apellidoMedico   = '';
  especialidad     = '';
  fecha            = '';
  horaInicio       = '';
  horaFin          = '';
  idCitaReagendar  = 0;

  // Formulario
  motivoConsulta = '';
  modalidad: 'presencial' | 'telemedicina' = 'presencial';

  // Estado
  isSubmitting = signal(false);
  showError    = false;
  showSuccess  = false;
  errorMsg     = '';
  successMsg   = '¡Cita reservada correctamente! Redirigiendo...';

  ngOnInit(): void {
    const user = this.authSvc.getCurrentUser();
    this.userName = user?.name ?? '';

    this.idDisponibilidad = Number(this.route.snapshot.paramMap.get('idDisponibilidad'));
    const qp = this.route.snapshot.queryParams;

    this.idMedico       = Number(qp['idMedico']);
    this.idEspecialidad = Number(qp['idEspecialidad']);
    this.nombreMedico   = qp['nombre'] ?? '';
    this.apellidoMedico = qp['apellido'] ?? '';
    this.especialidad   = qp['especialidad'] ?? '';
    this.fecha          = qp['fecha'] ?? '';
    this.horaInicio     = qp['horaInicio'] ?? '';
    this.horaFin        = qp['horaFin'] ?? '';

    const reagendarCitaParam = this.route.snapshot.queryParamMap.get('reagendarCita');
    if (reagendarCitaParam !== null) {
      this.idCitaReagendar = Number(reagendarCitaParam);
      if (!this.idCitaReagendar || this.idCitaReagendar < 1) {
        this.router.navigate(['/paciente/home']);
        return;
      }
    }

    // Validar que vengan todos los datos necesarios
    if (!this.idDisponibilidad || !this.idMedico || !this.idEspecialidad || !this.fecha) {
      this.router.navigate(['/paciente/reservar']);
      return;
    }
  }

  cambiarHorario(): void {
    window.history.back();
  }

  reservar(): void {
    if (this.isSubmitting()) return;

    if (this.esReagendamiento) {
      this.reagendar();
      return;
    }

    // Validación frontend
    const motivo = this.motivoConsulta.trim();
    if (motivo.length < 3 || motivo.length > 255) {
      this.errorMsg  = 'El motivo de consulta debe tener entre 3 y 255 caracteres.';
      this.showError = true;
      return;
    }

    this.isSubmitting.set(true);

    const payload: CrearCitaPayload = {
      id_medico:         this.idMedico,
      id_especialidad:   this.idEspecialidad,
      id_disponibilidad: this.idDisponibilidad,
      modalidad:         this.modalidad,
      motivo_consulta:   motivo,
    };

    this.svc.crearCita(payload).subscribe({
      next: () => {
        this.successMsg = '¡Cita reservada correctamente! Redirigiendo...';
        this.showSuccess = true;
        // Redirigir al home después de un momento
        setTimeout(() => {
          this.router.navigate(['/paciente/home']);
        }, 2500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMsg  = err?.error?.message ?? 'No se pudo reservar la cita. Intenta nuevamente.';
        this.showError = true;
      },
    });
  }

  private reagendar(): void {
    this.isSubmitting.set(true);

    this.svc.reagendarCita(this.idCitaReagendar, this.idDisponibilidad).subscribe({
      next: () => {
        this.successMsg  = '¡Cita reagendada correctamente! Redirigiendo...';
        this.showSuccess = true;
        setTimeout(() => {
          this.router.navigate(['/paciente/citas', this.idCitaReagendar]);
        }, 2500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMsg  = err?.error?.message ?? 'No se pudo reagendar la cita. Intenta nuevamente.';
        this.showError = true;
      },
    });
  }

  // ── Helpers ─────────────────────────────────
  iniciales(): string {
    return `${this.nombreMedico.charAt(0)}${this.apellidoMedico.charAt(0)}`.toUpperCase();
  }

  temaAvatar(): string {
    const temas = ['primary', 'tertiary', 'secondary'];
    return temas[this.idMedico % temas.length];
  }

  titulo(): string {
    return this.nombreMedico.endsWith('a') ? 'Dra.' : 'Dr.';
  }

  formatFecha(): string {
    return this.fecha ? formatFechaLargaConDia(this.fecha) : '';
  }

  formatHora(hora: string): string {
    return hora ? formatHoraCorta(hora) : '';
  }

  get motivoValido(): boolean {
    if (this.esReagendamiento) return true;
    const t = this.motivoConsulta.trim();
    return t.length >= 3 && t.length <= 255;
  }

  get esReagendamiento(): boolean {
    return this.idCitaReagendar > 0;
  }

  get textoAccionPrimaria(): string {
    if (this.isSubmitting()) {
      return this.esReagendamiento ? 'Reagendando...' : 'Reservando...';
    }
    return this.esReagendamiento ? 'Reagendar cita' : 'Reservar cita';
  }
}
