import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { IonContent, IonRefresher, IonRefresherContent, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { PacienteService, PerfilData } from '../../../core/services/paciente.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls:   ['./perfil.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonRefresher, IonRefresherContent,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class PerfilPage implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly svc       = inject(PacienteService);
  private readonly router    = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  perfil: PerfilData | null = null;
  isLoading = true;

  // Iniciales para el avatar generado a partir del nombre
  get initiales(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre[0] ?? ''}${this.perfil.apellido[0] ?? ''}`.toUpperCase();
  }

  get nombreCompleto(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre} ${this.perfil.apellido}`;
  }

  get noLeidas(): number {
    return this.perfil?.alertas ?? 0;
  }

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(event?: { target: { complete: () => void } }): void {
    this.isLoading = true;
    this.svc.getPerfil().subscribe({
      next: (data) => {
        this.perfil    = data;
        this.isLoading = false;
        event?.target?.complete();
      },
      error: async (err) => {
        this.isLoading = false;
        event?.target?.complete();
        const toast = await this.toastCtrl.create({
          message:  err?.error?.message ?? 'Error al cargar el perfil.',
          duration: 3500,
          color:    'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  /** Formatea una fecha ISO a "12 abr. 2026" sin desfase de zona horaria */
  formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const [y, m, d] = (fecha as string).split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  /** Formatea fecha de próxima cita a "12 Oct" para el bento */
  formatFechaBento(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const [y, m, d] = (fecha as string).split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short',
    });
  }

  navegar(destino: string): void {
    this.router.navigate(['/paciente', destino]);
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
