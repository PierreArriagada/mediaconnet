import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService, ResetPasswordPayload } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styles: [`
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-size: 1.5rem;
      line-height: 1;
      display: inline-block;
      user-select: none;
    }

    ion-content {
      --background: var(--mc-surface);
    }

    .rp-page {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background: var(--mc-surface);
      color: var(--mc-on-surface);
      font-family: var(--mc-font-utility);
    }

    .rp-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 50;
      background: var(--mc-glass-bg);
      backdrop-filter: blur(var(--mc-glass-blur));
      -webkit-backdrop-filter: blur(var(--mc-glass-blur));
    }

    .rp-header__inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      max-width: 80rem;
      margin: 0 auto;
      width: 100%;
    }

    .rp-header__logo {
      font-family: var(--mc-font-authority);
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: -0.03em;
      color: var(--mc-primary);
    }

    .rp-header__back {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--mc-secondary);
      font-family: var(--mc-font-utility);
      font-size: 0.9375rem;
      font-weight: 600;
      padding: 0.5rem;
      border-radius: var(--mc-radius-sm);
      transition: color 0.15s ease;
    }

    .rp-header__back:hover {
      color: var(--mc-primary);
    }

    .rp-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 5.5rem;
      padding-bottom: 3rem;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }

    .rp-content {
      width: 100%;
      max-width: 40rem;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .rp-headline {
      max-width: 34rem;
    }

    .rp-headline__title {
      font-family: var(--mc-font-authority);
      font-size: clamp(2.5rem, 8vw, 3.75rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--mc-on-surface);
      margin: 0 0 1.25rem;
    }

    .rp-headline__subtitle {
      font-family: var(--mc-font-utility);
      font-size: 1.0625rem;
      line-height: var(--mc-leading-body);
      color: var(--mc-on-surface-variant);
      margin: 0;
    }

    .rp-card-wrapper {
      background: var(--mc-surface-container-low);
      border-radius: var(--mc-radius-lg);
      padding: 0.25rem;
    }

    .rp-card {
      background: var(--mc-surface-container-lowest);
      border-radius: var(--mc-radius-lg);
      padding: 2rem;
      box-shadow: var(--mc-shadow-fab);
      border: 1px solid var(--mc-border-ghost);
    }

    @media (min-width: 640px) {
      .rp-card {
        padding: 3rem;
      }
    }

    .rp-info-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: var(--mc-radius-md);
      background: rgba(183, 212, 253, 0.3);
      margin-bottom: 2rem;
    }

    .rp-info-card__icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      background: var(--mc-primary-container);
      color: var(--mc-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rp-info-card__icon .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .rp-info-card__body {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .rp-info-card__title {
      font-family: var(--mc-font-authority);
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--mc-on-secondary-container);
      margin: 0;
    }

    .rp-info-card__text {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--mc-on-secondary-container);
      margin: 0;
    }

    .rp-form {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--mc-on-surface-variant);
      padding-left: 0.25rem;
    }

    .field__input-wrapper {
      position: relative;
    }

    .field__icon {
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--mc-outline);
      pointer-events: none;
      font-size: 1.375rem;
    }

    .field__input {
      width: 100%;
      background: var(--mc-surface-container-high);
      border: none;
      border-radius: var(--mc-radius-md);
      padding: 1.125rem 1.25rem 1.125rem 3.5rem;
      font-family: var(--mc-font-utility);
      font-size: 1rem;
      font-weight: 500;
      color: var(--mc-on-surface);
      outline: none;
      box-sizing: border-box;
      transition: box-shadow 0.2s ease, background 0.2s ease;
    }

    .field__input::placeholder {
      color: var(--mc-outline);
      opacity: 0.6;
    }

    .field__input:focus {
      box-shadow: 0 0 0 2px var(--mc-primary-container);
    }

    .field__input--with-toggle {
      padding-right: 3.5rem;
    }

    .field__input--error {
      background: var(--mc-error-container);
    }

    .field__input--error:focus {
      box-shadow: 0 0 0 2px var(--mc-error);
    }

    .field__toggle {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--mc-outline);
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }

    .field__toggle:hover {
      color: var(--mc-primary);
    }

    .field__toggle .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .field__error {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding-left: 0.25rem;
      color: var(--mc-error);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .field__error-icon {
      font-size: 0.875rem !important;
      flex-shrink: 0;
    }

    .btn-primary {
      width: 100%;
      background: var(--mc-gradient-primary);
      color: var(--mc-on-primary);
      font-family: var(--mc-font-utility);
      font-size: 1rem;
      font-weight: 700;
      padding: 1rem 2rem;
      border-radius: var(--mc-radius-xl);
      border: none;
      cursor: pointer;
      box-shadow: var(--mc-shadow-fab);
      min-height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .btn-primary:active:not(:disabled) {
      transform: scale(0.98);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .btn-spinner {
      --color: var(--mc-on-primary);
      width: 24px;
      height: 24px;
    }
  `],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner],
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  resetForm: FormGroup;
  isLoading = false;
  token: string | null = null;

  constructor() {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || null;
      if (!this.token) {
        // Si no hay token, redirigir a forgot-password
        this.router.navigate(['/auth/forgot-password']);
      }
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }

    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid || !this.token) {
      return;
    }

    this.isLoading = true;

    try {
      const payload: ResetPasswordPayload = {
        token: this.token,
        newPassword: this.resetForm.value.newPassword,
        confirmPassword: this.resetForm.value.confirmPassword,
      };

      await this.authSvc.resetPassword(payload).toPromise();

      // Redirigir a login con mensaje de éxito
      this.router.navigate(['/auth/login'], {
        queryParams: { message: 'password_reset_success' }
      });

    } catch (error: any) {
      console.error('Error resetting password:', error);
      // El error ya se maneja en el servicio
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  togglePasswordVisibility(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }
}