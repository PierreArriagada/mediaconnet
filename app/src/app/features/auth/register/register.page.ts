import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AuthService, RegisterPayload } from '../../../core/services/auth.service';

// Validadores del formulario

/** Solo letras (con tildes/ñ), espacios y guiones. Previene XSS por entrada. */
const NOMBRE_RE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']{2,100}$/;

/** RUT chileno: dígitos con puntos opcionales, guión y dígito/K verificador.
 *  Valida además con algoritmo módulo 11.
 */
const RUT_RE = /^\d{1,3}\.?\d{3}\.?\d{3}-[\dkK]$/;

function rutValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const val: string = (ctrl.value ?? '').trim();
    if (!val) return null; // campo opcional

    if (!RUT_RE.test(val)) return { rutFormat: true };

    // Verificación módulo 11
    const clean = val.replace(/[.\-]/g, '').toUpperCase();
    const digits = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let mult = 2;
    for (let i = digits.length - 1; i >= 0; i--) {
      sum += parseInt(digits[i], 10) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const expected = 11 - (sum % 11);
    const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
    return dv === dvCalc ? null : { rutInvalid: true };
  };
}

/** Contraseña: mínimo 8 chars, 1 mayúscula, 1 número. */
function passwordStrengthValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v: string = ctrl.value ?? '';
    if (!v) return null;
    if (v.length < 8) return { minLength: true };
    if (!/[A-Z]/.test(v)) return { noUppercase: true };
    if (!/\d/.test(v)) return { noNumber: true };
    return null;
  };
}

/** Compara password y confirmación. Se aplica al FormGroup. */
function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const pw  = group.get('password')?.value ?? '';
    const cpw = group.get('confirmPassword')?.value ?? '';
    return pw === cpw ? null : { passwordMismatch: true };
  };
}

// Componente

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner],
})
export class RegisterPage {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly toastCtrl   = inject(ToastController);

  form: FormGroup;
  isLoading       = false;
  showPassword    = false;
  showConfirm     = false;

  constructor() {
    this.form = this.fb.group(
      {
        nombre: [
          '',
          [Validators.required, Validators.pattern(NOMBRE_RE)],
        ],
        apellido: [
          '',
          [Validators.required, Validators.pattern(NOMBRE_RE)],
        ],
        correo: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(150)],
        ],
        telefono: [
          '',
          [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)],
        ],
        rut: ['', [rutValidator()]],
        password:        ['', [Validators.required, passwordStrengthValidator()]],
        confirmPassword: ['', [Validators.required]],
        terms:           [false, [Validators.requiredTrue]],
      },
      { validators: passwordMatchValidator() }
    );
  }

  // Métodos auxiliares

  /**
   * Formatea el RUT chileno mientras el usuario escribe.
   * Convierte cualquier entrada en XX.XXX.XXX-X automáticamente.
   * La validación mod-11 la sigue haciendo el validator del control.
   */
  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Limpia: solo dígitos y K, en mayúscula, máximo 9 chars (8 body + DV)
    let clean = input.value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length > 9) clean = clean.slice(0, 9);

    let formatted = '';
    if (clean.length > 1) {
      const dv           = clean.slice(-1);
      const body         = clean.slice(0, -1);
      // Inserta puntos cada 3 dígitos desde la derecha
      const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      formatted = `${bodyFormatted}-${dv}`;
    } else {
      formatted = clean;
    }

    // Actualiza el DOM directamente para evitar salto de cursor,
    // luego sincroniza el FormControl sin re-emitir el evento de input.
    input.value = formatted;
    this.form.get('rut')!.setValue(formatted, { emitEvent: false });
    this.form.get('rut')!.markAsDirty();
  }

  hasError(field: string, error?: string): boolean {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  groupHasError(error: string): boolean {
    return this.form.touched && this.form.hasError(error);
  }

  // Envío del formulario

  async onRegister(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading) return;

    this.isLoading = true;

    // Sanea los valores: recorta espacios y normaliza el correo a minúsculas
    const raw = this.form.value;
    const payload: RegisterPayload = {
      nombre:   raw.nombre.trim(),
      apellido: raw.apellido.trim(),
      correo:   raw.correo.trim().toLowerCase(),
      password: raw.password,
      ...(raw.telefono?.trim() && { telefono: raw.telefono.trim() }),
      ...(raw.rut?.trim()      && { rut: raw.rut.trim() }),
    };

    this.authService.register(payload).subscribe({
      next: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: '¡Cuenta creada! Ya puedes iniciar sesión.',
          duration: 3000,
          color: 'success',
          position: 'bottom',
        });
        await toast.present();
        this.router.navigate(['/auth/login']);
      },
      error: async (err: { error?: { message?: string } }) => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message ?? 'Error al crear la cuenta. Intenta nuevamente.',
          duration: 3500,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

