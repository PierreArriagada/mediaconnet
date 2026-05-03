import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

@Component({
  selector: 'app-operacion-hub',
  templateUrl: './operacion-hub.page.html',
  styleUrls:   ['./operacion-hub.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class OperacionHubPage {
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);

  user = this.auth.getCurrentUser();

  get firstName(): string {
    return this.user?.name?.split(' ')[0] ?? 'Administrador';
  }

  irA(ruta: string): void {
    this.router.navigate(['/admin/operacion', ruta]);
  }
}
