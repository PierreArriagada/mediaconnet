import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AuthService, ResetPasswordPayload } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner],
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastCtrl = inject(ToastController);

  form: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  resetToken: string | null = null;
  passwordUpdated = false;

  constructor() {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    // Extraer token de la URL
    this.route.queryParams.subscribe((params) => {
      this.resetToken = params['token'] || null;
      if (!this.resetToken) {
        this.showErrorToast('Token inválido o expirado');
        this.router.navigate(['/auth/login']);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading || !this.resetToken) return;

    const { newPassword, confirmPassword } = this.form.value;

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      await this.showErrorToast('Las contraseñas no coinciden');
      return;
    }

    this.isLoading = true;

    const payload: ResetPasswordPayload = {
      token: this.resetToken,
      newPassword,
      confirmPassword,
    };

    this.authService.resetPassword(payload).subscribe({
      next: async () => {
        this.isLoading = false;
        this.passwordUpdated = true;
        await this.showSuccessToast('Contraseña actualizada correctamente');
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: async (err) => {
        this.isLoading = false;
        const errorMessage = err?.error?.message ?? 'Error al actualizar la contraseña';
        await this.showErrorToast(errorMessage);
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom',
    });
    await toast.present();
  }
}
