import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

type AdminQuickRoute =
  | '/admin/medicos'
  | '/admin/pacientes'
  | '/admin/operacion/solicitudes'
  | '/admin/operacion';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls:   ['./admin-home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class AdminHomePage implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly router    = inject(Router);

  user = this.auth.getCurrentUser();

  get firstName(): string {
    return this.user?.name?.split(' ')[0] ?? 'Administrador';
  }

  ngOnInit(): void {
    // Verificación defensiva de rol en el cliente
    if (this.user?.role !== 'Administrador') {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
      return;
    }
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  irA(ruta: AdminQuickRoute): void {
    this.router.navigateByUrl(ruta);
  }
}
