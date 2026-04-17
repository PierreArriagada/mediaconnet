import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AuthService, ForgotPasswordPayload } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner],
})
export class ForgotPasswordPage {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly toastCtrl   = inject(ToastController);

  form: FormGroup;
  isLoading  = false;
  emailSent  = false;

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    });
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading) return;

    this.isLoading = true;

    // Normalizar a minúsculas antes de enviar para evitar duplicados por casing
    const payload: ForgotPasswordPayload = {
      email: (this.form.value.email as string).trim().toLowerCase(),
    };

    this.authService.forgotPassword(payload).subscribe({
      next: async () => {
        this.isLoading = false;
        this.emailSent = true;
        await this.showConfirmationToast();
      },
      // Por seguridad (anti-enumeración) mostramos el mismo mensaje de éxito aunque falle
      error: async () => {
        this.isLoading = false;
        this.emailSent = true;
        await this.showConfirmationToast();
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private async showConfirmationToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Si el correo está registrado, recibirás las instrucciones en breve.',
      duration: 4500,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }
}
