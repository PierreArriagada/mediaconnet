import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { IonContent, IonRefresher, IonRefresherContent, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { PacienteService, PerfilData } from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { formatFechaCompleta, formatFechaCorta } from '../../../shared/utils/fecha.utils';
import { inicialesPersona } from '../../../shared/utils/paciente-ui.utils';

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
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  perfil: PerfilData | null = null;
  isLoading = true;
  private yaEntroALaVista = false;

  // Iniciales para el avatar generado a partir del nombre
  get initiales(): string {
    if (!this.perfil) return '';
    return inicialesPersona(this.perfil.nombre, this.perfil.apellido);
  }

  get nombreCompleto(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre} ${this.perfil.apellido}`;
  }

  get noLeidas(): number {
    return this.notificacionesState.noLeidas() ?? this.perfil?.alertas ?? 0;
  }

  ngOnInit(): void {
    this.cargarPerfil();
  }

  ionViewWillEnter(): void {
    if (this.yaEntroALaVista) {
      this.cargarPerfil();
    }
    this.yaEntroALaVista = true;
  }

  cargarPerfil(event?: { target: { complete: () => void } }): void {
    this.isLoading = !this.perfil;
    this.svc.getPerfil().subscribe({
      next: (data) => {
        this.perfil    = data;
        this.notificacionesState.setNoLeidas(data.alertas);
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
    return formatFechaCompleta(fecha);
  }

  /** Formatea fecha de próxima cita a "12 Oct" para el bento */
  formatFechaBento(fecha: string | null | undefined): string {
    return formatFechaCorta(fecha);
  }

  navegar(destino: string): void {
    this.router.navigateByUrl(`/paciente/${destino}`);
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
