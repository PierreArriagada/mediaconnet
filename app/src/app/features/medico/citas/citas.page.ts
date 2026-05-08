import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import {
  DetalleCitaMedicoData,
  GuardarHistorialCitaPayload,
  MedicoService,
} from '../../../core/services/medico.service';
import { NotificacionesMedicoStateService } from '../../../core/services/notificaciones-medico-state.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { formatFechaLargaConDia, formatHoraCorta } from '../../../shared/utils/fecha.utils';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonSpinner,
    CommonModule,
    ReactiveFormsModule,
    MedicoHeaderComponent,
    MedicoBottomNavComponent,
  ],
})
export class CitasPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly medicoService = inject(MedicoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly notificacionesState = inject(NotificacionesMedicoStateService);

  readonly maxTextoClinico = 5000;

  user = this.authService.getCurrentUser();
  idCita: number | null = null;
  detalle: DetalleCitaMedicoData | null = null;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  sinCitaSeleccionada = false;

  historialForm = this.fb.group({
    diagnostico: ['', [Validators.maxLength(this.maxTextoClinico)]],
    tratamiento: ['', [Validators.maxLength(this.maxTextoClinico)]],
    observaciones: ['', [Validators.maxLength(this.maxTextoClinico)]],
  });

  get noLeidas(): number {
    return this.notificacionesState.noLeidas() ?? this.detalle?.noLeidas ?? 0;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('idCita');

    if (!idParam) {
      this.sinCitaSeleccionada = true;
      this.isLoading = false;
      return;
    }

    const idCita = Number(idParam);
    if (!Number.isInteger(idCita) || idCita < 1) {
      this.errorMessage = 'La cita solicitada no es válida.';
      this.isLoading = false;
      return;
    }

    this.idCita = idCita;
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (!this.idCita) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getDetalleCita(this.idCita).subscribe({
      next: (data) => {
        this.detalle = data;
        this.notificacionesState.setNoLeidas(data.noLeidas);
        this.historialForm.patchValue({
          diagnostico: data.historial?.diagnostico ?? '',
          tratamiento: data.historial?.tratamiento ?? '',
          observaciones: data.historial?.observaciones ?? '',
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'No fue posible cargar el detalle de la cita.';
        this.isLoading = false;
      },
    });
  }

  guardarHistorial(): void {
    if (!this.idCita || !this.detalle?.puedeRegistrarHistorial || this.isSaving) return;

    this.historialForm.markAllAsTouched();
    if (this.historialForm.invalid) {
      void this.mostrarToast('Revisa la longitud de los campos clínicos.', 'warning');
      return;
    }

    const payload = this.obtenerPayloadHistorial();
    if (!payload.diagnostico && !payload.tratamiento && !payload.observaciones) {
      void this.mostrarToast('Registra diagnóstico, tratamiento u observaciones antes de guardar.', 'warning');
      return;
    }

    this.isSaving = true;
    this.medicoService.guardarHistorialCita(this.idCita, payload).subscribe({
      next: async (res) => {
        this.isSaving = false;
        this.detalle = {
          ...this.detalle!,
          historial: res.historial,
        };
        await this.mostrarToast(res.message, 'success');
      },
      error: async (err) => {
        this.isSaving = false;
        await this.mostrarToast(err?.error?.message ?? 'No fue posible guardar el historial clínico.', 'danger');
      },
    });
  }

  volverAgenda(): void {
    this.router.navigate(['/medico/agenda']);
  }

  verFichaPaciente(): void {
    const idPaciente = this.detalle?.cita.id_paciente;
    if (!idPaciente) return;

    this.router.navigate(['/medico/pacientes', idPaciente, 'ficha']);
  }

  formatFecha(fecha: string | null | undefined): string {
    return formatFechaLargaConDia(fecha);
  }

  formatHora(hora: string | null | undefined): string {
    return formatHoraCorta(hora);
  }

  normalizarEstado(estado: string): string {
    return estado.replace('_', ' ');
  }

  labelAsistencia(asistio: boolean | null): string {
    if (asistio === true) return 'Asistió';
    if (asistio === false) return 'No asistió';
    return 'Pendiente';
  }

  private obtenerPayloadHistorial(): GuardarHistorialCitaPayload {
    const value = this.historialForm.getRawValue();

    return {
      diagnostico: value.diagnostico?.trim() || null,
      tratamiento: value.tratamiento?.trim() || null,
      observaciones: value.observaciones?.trim() || null,
    };
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
