import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { PacienteService, PerfilData, ActualizarPerfilPacientePayload } from '../../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

@Component({
  selector: 'app-mis-datos-paciente',
  templateUrl: './mis-datos.page.html',
  styleUrls:   ['./mis-datos.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent, IonSpinner,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class MisDatosPage implements OnInit {
  private readonly svc       = inject(PacienteService);
  private readonly router    = inject(Router);
  private readonly fb        = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  isLoading  = true;
  isSaving   = false;
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre:               ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido:             ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      correo:               ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono:             ['', [Validators.maxLength(20)]],
      rut:                  [{ value: '', disabled: true }],
      fecha_nacimiento:     [''],
      direccion:            ['', [Validators.maxLength(200)]],
      comuna:               ['', [Validators.maxLength(100)]],
      ciudad:               ['', [Validators.maxLength(100)]],
      contacto_emergencia:  ['', [Validators.maxLength(150)]],
      telefono_emergencia:  ['', [Validators.maxLength(20)]],
    });

    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading = true;
    this.svc.getPerfil().subscribe({
      next: (data: PerfilData) => {
        this.form.patchValue({
          nombre:               data.nombre,
          apellido:             data.apellido,
          correo:               data.correo,
          telefono:             data.telefono ?? '',
          rut:                  data.rut ?? 'Sin RUT registrado',
          fecha_nacimiento:     data.fecha_nacimiento
                                  ? (data.fecha_nacimiento as string).substring(0, 10)
                                  : '',
          direccion:            data.direccion ?? '',
          comuna:               data.comuna ?? '',
          ciudad:               data.ciudad ?? '',
          contacto_emergencia:  data.contacto_emergencia ?? '',
          telefono_emergencia:  data.telefono_emergencia ?? '',
        });
        this.isLoading = false;
      },
      error: async () => {
        this.isLoading = false;
        await this.mostrarToast('Error al cargar los datos del perfil.', 'danger');
      },
    });
  }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;
    const v = this.form.getRawValue();

    const payload: ActualizarPerfilPacientePayload = {
      nombre:               v.nombre.trim(),
      apellido:             v.apellido.trim(),
      correo:               v.correo.trim().toLowerCase(),
      telefono:             v.telefono?.trim() || null,
      fecha_nacimiento:     v.fecha_nacimiento || null,
      direccion:            v.direccion?.trim() || null,
      comuna:               v.comuna?.trim() || null,
      ciudad:               v.ciudad?.trim() || null,
      contacto_emergencia:  v.contacto_emergencia?.trim() || null,
      telefono_emergencia:  v.telefono_emergencia?.trim() || null,
    };

    this.svc.actualizarPerfil(payload).subscribe({
      next: async () => {
        this.isSaving = false;
        await this.mostrarToast('Datos actualizados correctamente.', 'success');
      },
      error: async (err) => {
        this.isSaving = false;
        await this.mostrarToast(err?.error?.message ?? 'Error al guardar los cambios.', 'danger');
      },
    });
  }

  volver(): void {
    this.router.navigate(['/paciente/perfil']);
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
