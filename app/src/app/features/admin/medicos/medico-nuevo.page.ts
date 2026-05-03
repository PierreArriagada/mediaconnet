import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService, EspecialidadItem, NuevoMedicoPayload } from '../../../core/services/admin.service';

@Component({
  selector: 'app-medico-nuevo',
  templateUrl: './medico-nuevo.page.html',
  styleUrls: ['./medico-nuevo.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class MedicoNuevoPage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  especialidades: EspecialidadItem[] = [];

  // Formulario
  nombre           = '';
  apellido         = '';
  correo           = '';
  telefono         = '';
  passwordInicial  = '';
  idEspecialidad: number | null = null;
  numeroRegistro   = '';
  aniosExperiencia = 0;
  biografia        = '';

  mostrarPassword  = false;
  enviando         = false;
  errorMsg         = '';
  successMsg       = '';

  ngOnInit(): void {
    this.adminService.getEspecialidades().subscribe({
      next: (esp) => (this.especialidades = esp.filter((e) => e.estado === 'activa')),
      error: () => (this.errorMsg = 'No se pudieron cargar las especialidades.'),
    });
  }

  volver(): void {
    this.router.navigate(['/admin/medicos']);
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  esFormularioValido(): boolean {
    return !!(
      this.nombre.trim() &&
      this.apellido.trim() &&
      this.correo.trim() &&
      this.passwordInicial.length >= 8 &&
      this.idEspecialidad &&
      this.numeroRegistro.trim()
    );
  }

  guardar(): void {
    if (!this.esFormularioValido()) {
      this.errorMsg = 'Completa todos los campos obligatorios. La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.enviando = true;
    this.errorMsg = '';
    this.successMsg = '';

    const payload: NuevoMedicoPayload = {
      nombre:           this.nombre.trim(),
      apellido:         this.apellido.trim(),
      correo:           this.correo.trim(),
      telefono:         this.telefono.trim() || undefined,
      password_inicial: this.passwordInicial,
      id_especialidad:  this.idEspecialidad!,
      numero_registro:  this.numeroRegistro.trim(),
      anios_experiencia: this.aniosExperiencia,
      biografia:        this.biografia.trim() || undefined,
    };

    this.adminService.crearMedico(payload).subscribe({
      next: (res) => {
        this.enviando = false;
        this.successMsg = 'Médico creado correctamente.';
        setTimeout(() => {
          this.router.navigate(['/admin/medicos', res.id_medico]);
        }, 1200);
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = err?.error?.message ?? 'Error al crear el médico.';
      },
    });
  }
}
