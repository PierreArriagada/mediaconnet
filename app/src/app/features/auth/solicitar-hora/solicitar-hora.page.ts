import { Component, inject, OnInit, signal } from '@angular/core';
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
import { CitasService, Especialidad } from '../../../core/services/citas.service';

// Patrón de RUT chileno: formato XX.XXX.XXX-X con verificación módulo 11
const RUT_RE = /^\d{1,3}\.?\d{3}\.?\d{3}-[\dkK]$/;

function rutValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const val: string = (ctrl.value ?? '').trim();
    if (!val) return { required: true };
    if (!RUT_RE.test(val)) return { rutFormat: true };

    const clean  = val.replace(/[.\-]/g, '').toUpperCase();
    const digits = clean.slice(0, -1);
    const dv     = clean.slice(-1);
    let sum = 0, mult = 2;

    for (let i = digits.length - 1; i >= 0; i--) {
      sum += parseInt(digits[i], 10) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }

    const expected = 11 - (sum % 11);
    const dvCalc   = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
    return dv === dvCalc ? null : { rutInvalid: true };
  };
}

@Component({
  selector: 'app-solicitar-hora',
  templateUrl: './solicitar-hora.page.html',
  styleUrls: ['./solicitar-hora.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonSpinner],
})
export class SolicitarHoraPage implements OnInit {
  private readonly fb         = inject(FormBuilder);
  private readonly citasSvc   = inject(CitasService);
  private readonly router     = inject(Router);
  private readonly toastCtrl  = inject(ToastController);

  form!: FormGroup;
  isLoading     = false;
  especialidades = signal<Especialidad[]>([]);
  exito          = signal(false);

  // Fecha mínima = hoy para prevenir reservas en el pasado
  readonly minFecha = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']{2,100}$/)],
      ],
      apellido: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']{2,100}$/)],
      ],
      rut: ['', [Validators.required, rutValidator()]],
      telefono: [
        '',
        [Validators.required, Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)],
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      fecha_nacimiento: ['', [Validators.required]],
      id_especialidad:  [null, [Validators.required]],
      motivo_consulta:  ['', [Validators.required, Validators.maxLength(255)]],
      fecha_preferente: ['', [Validators.required]],
      franja_horaria:   ['', [Validators.required]],
    });

    // Cargar especialidades desde la BD real
    this.citasSvc.getEspecialidades().subscribe({
      next: (data) => this.especialidades.set(data),
    });
  }

  /**
   * Formatea el RUT mientras el usuario escribe (XX.XXX.XXX-X).
   * Mismo patrón usado en register para consistencia de UX.
   */
  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let clean   = input.value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length > 9) clean = clean.slice(0, 9);

    let formatted = '';
    if (clean.length > 1) {
      const dv            = clean.slice(-1);
      const body          = clean.slice(0, -1);
      const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      formatted = `${bodyFormatted}-${dv}`;
    } else {
      formatted = clean;
    }

    input.value = formatted;
    this.form.get('rut')!.setValue(formatted, { emitEvent: false });
    this.form.get('rut')!.markAsDirty();
  }

  hasError(field: string, error?: string): boolean {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const raw = this.form.value;

    this.citasSvc.crearCitaInvitado({
      nombre:           raw.nombre.trim(),
      apellido:         raw.apellido.trim(),
      rut:              raw.rut.trim(),
      telefono:         raw.telefono.trim(),
      correo:           raw.correo.trim(),
      fecha_nacimiento: raw.fecha_nacimiento,
      id_especialidad:  Number(raw.id_especialidad),
      motivo_consulta:  raw.motivo_consulta.trim(),
      fecha_preferente: raw.fecha_preferente,
      franja_horaria:   raw.franja_horaria,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.exito.set(true);
      },
      error: async (err) => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message:  err?.error?.message ?? 'Error al enviar la solicitud',
          duration: 4000,
          color:    'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  volverLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
