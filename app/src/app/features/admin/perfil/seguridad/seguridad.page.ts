import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { AdminService, CambiarPasswordAdminPayload } from '../../../../core/services/admin.service';
import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva     = group.get('contrasena_nueva')?.value;
  const confirmar = group.get('confirmar_nueva')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-seguridad-admin',
  templateUrl: './seguridad.page.html',
  styleUrls:   ['./seguridad.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner, AdminHeaderComponent, AdminBottomNavComponent],
})
export class SeguridadAdminPage {
  private readonly svc       = inject(AdminService);
  private readonly router    = inject(Router);
  private readonly fb        = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  isSaving          = false;
  mostrarActual     = false;
  mostrarNueva      = false;
  mostrarConfirmar  = false;

  form: FormGroup = this.fb.group(
    {
      contrasena_actual: ['', [Validators.required]],
      contrasena_nueva:  ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmar_nueva:   ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  async cambiar(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const v = this.form.value;
    const payload: CambiarPasswordAdminPayload = { contrasena_actual: v.contrasena_actual, contrasena_nueva: v.contrasena_nueva };
    this.svc.cambiarPassword(payload).subscribe({
      next: async () => {
        this.isSaving = false;
        this.form.reset();
        await this.mostrarToast('Contraseña actualizada correctamente.', 'success');
      },
      error: async (err) => {
        this.isSaving = false;
        await this.mostrarToast(err?.error?.message ?? 'Error al cambiar la contraseña.', 'danger');
      },
    });
  }

  volver(): void { this.router.navigate(['/admin/perfil']); }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
