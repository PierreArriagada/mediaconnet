import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent, IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    const usuarioActual = this.authService.getCurrentUser();

    if (!this.authService.isAuthenticated() || !usuarioActual) {
      return;
    }

    this.redirigirSegunRol(usuarioActual.role);
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.redirigirSegunRol(res.user.role);
      },
      error: async (err) => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message ?? 'Error al iniciar sesión',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  private redirigirSegunRol(role: string): void {
    switch (role) {
      case 'Paciente':
        this.router.navigate(['/paciente/home'], { replaceUrl: true });
        break;
      case 'Medico':
        this.router.navigate(['/medico/home'], { replaceUrl: true });
        break;
      case 'Administrador':
        this.router.navigate(['/admin/home'], { replaceUrl: true });
        break;
      default:
        this.router.navigate(['/auth/login'], { replaceUrl: true });
        break;
    }
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }

  navigateAsGuest() {
    this.router.navigate(['/auth/solicitar-hora']);
  }
}
