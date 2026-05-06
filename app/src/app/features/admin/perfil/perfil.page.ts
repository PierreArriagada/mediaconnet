import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { IonContent, IonRefresher, IonRefresherContent, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { AdminService, PerfilAdminData } from '../../../core/services/admin.service';
import { NotificacionesAdminStateService } from '../../../core/services/notificaciones-admin-state.service';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { formatFechaCompleta } from '../../../shared/utils/fecha.utils';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls:   ['./perfil.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonRefresher, IonRefresherContent,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class PerfilPage implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly svc       = inject(AdminService);
  private readonly router    = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly notificacionesState = inject(NotificacionesAdminStateService);

  perfil: PerfilAdminData | null = null;
  isLoading = true;

  get initiales(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre[0] ?? ''}${this.perfil.apellido[0] ?? ''}`.toUpperCase();
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

  cargarPerfil(event?: { target: { complete: () => void } }): void {
    this.isLoading = true;
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

  formatFecha(fecha: string | null | undefined): string {
    return formatFechaCompleta(fecha);
  }

  navegar(destino: string): void {
    this.router.navigateByUrl(`/admin/${destino}`);
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
