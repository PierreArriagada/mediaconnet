import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, CrearCitaPayload } from '../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';

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

  // Formulario
  motivoConsulta = '';
  modalidad: 'presencial' | 'telemedicina' = 'presencial';

  // Estado
  isSubmitting = signal(false);
  showError    = false;
  showSuccess  = false;
  errorMsg     = '';

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

    // Validar que vengan todos los datos necesarios
    if (!this.idDisponibilidad || !this.idMedico || !this.idEspecialidad || !this.fecha) {
      this.router.navigate(['/paciente/reservar']);
    }
  }

  cambiarHorario(): void {
    window.history.back();
  }

  reservar(): void {
    if (this.isSubmitting()) return;

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
    if (!this.fecha) return '';
    const [y, m, d] = this.fecha.split('-').map(Number);
    const fechaObj = new Date(y, m - 1, d);
    const dias  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${dias[fechaObj.getDay()]} ${d} de ${meses[m - 1]} ${y}`;
  }

  formatHora(hora: string): string {
    return hora?.slice(0, 5) ?? '';
  }

  get motivoValido(): boolean {
    const t = this.motivoConsulta.trim();
    return t.length >= 3 && t.length <= 255;
  }
}
