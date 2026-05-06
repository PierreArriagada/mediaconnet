import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';

import { PacienteService, CambiarPasswordPayload } from '../../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva     = group.get('contrasena_nueva')?.value;
  const confirmar = group.get('confirmar_nueva')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-seguridad-paciente',
  templateUrl: './seguridad.page.html',
  styleUrls:   ['./seguridad.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent, IonSpinner,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class SeguridadPage {
  private readonly svc       = inject(PacienteService);
  private readonly router    = inject(Router);
  private readonly fb        = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);

  isSaving   = false;
  mostrarActual   = false;
  mostrarNueva    = false;
  mostrarConfirmar = false;

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

    const payload: CambiarPasswordPayload = {
      contrasena_actual: v.contrasena_actual,
      contrasena_nueva:  v.contrasena_nueva,
    };

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

  volver(): void {
    this.router.navigate(['/paciente/perfil']);
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
