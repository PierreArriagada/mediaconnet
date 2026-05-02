import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
<<<<<<< HEAD
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
=======
// Edu: servicios necesarios para cerrar sesión y redirigir
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
>>>>>>> 0752fbfe2d0c974887924f9bbfc2a8184ddc0cca

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, MedicoHeaderComponent, MedicoBottomNavComponent]
})
export class PerfilPage implements OnInit {
  private readonly authService = inject(AuthService);

<<<<<<< HEAD
  user = this.authService.getCurrentUser();
=======
  // Edu: se inyecta AuthService para cerrar sesión y Router para redirigir al login
  constructor(private auth: AuthService, private router: Router, private http: HttpClient) { }

  // Edu: almacena los datos del perfil del médico
  perfil: any = null;
>>>>>>> 0752fbfe2d0c974887924f9bbfc2a8184ddc0cca

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

  // Edu: cierra la sesión del médico y redirige al login
  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

}
