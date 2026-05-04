import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../../core/services/auth.service';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    MedicoHeaderComponent,
    MedicoBottomNavComponent
  ]
})
export class PerfilPage implements OnInit {

  // Edu: datos del perfil del médico
  perfil: any = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.cargarPerfil();
  }

  // Edu: obtiene el perfil del médico desde el backend
  cargarPerfil(): void {
    this.http.get<any>('http://localhost:3000/api/medico/perfil')
      .subscribe({
        next: (resp) => {
          this.perfil = resp.perfil;
        },
        error: (err) => {
          console.error('Error cargando perfil médico:', err);
        }
      });
  }

  // Edu: cierra sesión
  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  irCambiarContrasena(): void {
    this.router.navigate(['/auth/change-password']);
  }
}
