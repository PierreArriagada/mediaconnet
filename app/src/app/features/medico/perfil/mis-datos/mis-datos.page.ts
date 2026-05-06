import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { MedicoService, PerfilMedicoData, ActualizarPerfilMedicoPayload } from '../../../../core/services/medico.service';
import { MedicoHeaderComponent } from '../../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

@Component({
  selector: 'app-mis-datos-medico',
  templateUrl: './mis-datos.page.html',
  styleUrls:   ['./mis-datos.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent, IonSpinner,
    MedicoHeaderComponent,
    MedicoBottomNavComponent,
  ],
})
export class MisDatosMedicoPage implements OnInit {
  private readonly svc       = inject(MedicoService);
  private readonly router    = inject(Router);
  private readonly fb        = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  isLoading  = true;
  isSaving   = false;
  perfil: PerfilMedicoData | null = null;
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre:   ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      correo:   ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.maxLength(20)]],
    });

    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading = true;
    this.svc.getPerfil().subscribe({
      next: (data: PerfilMedicoData) => {
        this.perfil = data;
        this.form.patchValue({
          nombre:   data.nombre,
          apellido: data.apellido,
          correo:   data.correo,
          telefono: data.telefono ?? '',
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
    const v = this.form.value;

    const payload: ActualizarPerfilMedicoPayload = {
      nombre:   v.nombre.trim(),
      apellido: v.apellido.trim(),
      correo:   v.correo.trim().toLowerCase(),
      telefono: v.telefono?.trim() || null,
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
    this.router.navigate(['/medico/perfil']);
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
