import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { AdminService, PerfilAdminData, ActualizarPerfilAdminPayload } from '../../../../core/services/admin.service';
import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

@Component({
  selector: 'app-mis-datos-admin',
  templateUrl: './mis-datos.page.html',
  styleUrls:   ['./mis-datos.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    IonContent, IonSpinner,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class MisDatosAdminPage implements OnInit {
  private readonly svc       = inject(AdminService);
  private readonly router    = inject(Router);
  private readonly fb        = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  isLoading = true;
  isSaving  = false;
  perfil: PerfilAdminData | null = null;

  form: FormGroup = this.fb.group({
    nombre:   ['', [Validators.required, Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.maxLength(80)]],
    correo:   ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    telefono: ['', [Validators.maxLength(20)]],
  });

  ngOnInit(): void {
    this.svc.getPerfil().subscribe({
      next: (data) => {
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

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;

    const v = this.form.value;
    const payload: ActualizarPerfilAdminPayload = {
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
        await this.mostrarToast(err?.error?.message ?? 'Error al guardar los datos.', 'danger');
      },
    });
  }

  volver(): void { this.router.navigate(['/admin/perfil']); }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
