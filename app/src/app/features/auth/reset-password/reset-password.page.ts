import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterLink],
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  token = this.route.snapshot.queryParamMap.get('token') ?? '';

  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  get passwordsDoNotMatch(): boolean {
    return (
      this.submitted &&
      this.password.valid &&
      this.confirmPassword.valid &&
      this.password.value !== this.confirmPassword.value
    );
  }

  resetPassword(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage = 'El enlace de recuperación no es válido o no contiene token.';
      return;
    }

    if (this.form.invalid || this.password.value !== this.confirmPassword.value) {
      this.errorMessage = 'Revisa los datos ingresados antes de continuar.';
      return;
    }

    this.loading = true;

    this.authService
      .resetPassword({
        token: this.token,
        password: this.password.value,
      })
      .subscribe({
        next: (res) => {
          this.successMessage = res.message || 'Contraseña actualizada correctamente.';
          this.errorMessage = '';
          this.form.reset();
          this.submitted = false;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'No fue posible restablecer la contraseña. Intenta nuevamente.';
          this.successMessage = '';
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
