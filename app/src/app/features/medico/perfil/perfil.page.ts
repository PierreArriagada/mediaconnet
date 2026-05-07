import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { IonContent, IonRefresher, IonRefresherContent, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { MedicoService, PerfilMedicoData } from '../../../core/services/medico.service';
import { NotificacionesMedicoStateService } from '../../../core/services/notificaciones-medico-state.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { formatFechaCompleta } from '../../../shared/utils/fecha.utils';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls:   ['./perfil.page.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    IonContent, IonRefresher, IonRefresherContent,
    MedicoHeaderComponent,
    MedicoBottomNavComponent,
  ],
})
export class PerfilPage implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly svc       = inject(MedicoService);
  private readonly router    = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly notificacionesState = inject(NotificacionesMedicoStateService);

  perfil: PerfilMedicoData | null = null;
  isLoading = true;
  fotoPerfilPreview: string | null = null;
  fotoPerfilNombre = '';
  isUploadingPhoto = false;

  get initiales(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre[0] ?? ''}${this.perfil.apellido[0] ?? ''}`.toUpperCase();
  }

  get nombreCompleto(): string {
    if (!this.perfil) return '';
    return `${this.perfil.nombre} ${this.perfil.apellido}`;
  }

  get noLeidas(): number {
    return this.notificacionesState.noLeidas() ?? 0;
  }

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(event?: { target: { complete: () => void } }): void {
    this.isLoading = true;
    this.svc.getPerfil().subscribe({
      next: (data) => {
        this.perfil    = data;
        this.fotoPerfilPreview = this.obtenerUrlFotoPerfil(data.foto_perfil_url);
        this.fotoPerfilNombre = '';
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

  private obtenerUrlFotoPerfil(url: string | null | undefined): string | null {
    if (!url) return null;

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    const apiBase = environment.apiUrl.replace('/api', '');
    return `${apiBase}${url}`;
  }

  seleccionarFotoPerfil(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!formatosPermitidos.includes(archivo.type)) {
      void this.mostrarToast('Formato no permitido. Usa JPG, PNG o WEBP.', 'warning');
      input.value = '';
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;

    if (archivo.size > maxSizeBytes) {
      void this.mostrarToast('La imagen no puede superar los 5 MB.', 'warning');
      input.value = '';
      return;
    }

    this.fotoPerfilNombre = archivo.name;
    this.isUploadingPhoto = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.fotoPerfilPreview = String(reader.result);
    };
    reader.readAsDataURL(archivo);

    this.svc.subirFotoPerfil(archivo).subscribe({
      next: async (res) => {
        this.isUploadingPhoto = false;
        this.fotoPerfilPreview = this.obtenerUrlFotoPerfil(res.foto_perfil_url);

        if (this.perfil) {
          this.perfil = {
            ...this.perfil,
            foto_perfil_url: res.foto_perfil_url,
          };
        }

        await this.mostrarToast(res.message || 'Foto de perfil actualizada correctamente.', 'success');
      },
      error: async (err) => {
        this.isUploadingPhoto = false;
        this.fotoPerfilNombre = '';
        this.fotoPerfilPreview = this.obtenerUrlFotoPerfil(this.perfil?.foto_perfil_url);
        input.value = '';

        await this.mostrarToast(
          err?.error?.message || 'No fue posible subir la foto de perfil.',
          'danger'
        );
      },
    });
  }

  private async mostrarToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  formatFecha(fecha: string | null | undefined): string {
    return formatFechaCompleta(fecha);
  }

  navegar(destino: string): void {
    this.router.navigateByUrl(`/medico/${destino}`);
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
