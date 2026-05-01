import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
// Edu: servicios necesarios para cerrar sesión y redirigir
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, MedicoBottomNavComponent]
})
export class PerfilPage implements OnInit {

  // Edu: se inyecta AuthService para cerrar sesión y Router para redirigir al login
  constructor(private auth: AuthService, private router: Router, private http: HttpClient) { }

  // Edu: almacena los datos del perfil del médico
  perfil: any = null;

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
