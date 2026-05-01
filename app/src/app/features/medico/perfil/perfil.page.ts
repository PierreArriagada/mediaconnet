import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
// Edu: servicios necesarios para cerrar sesión y redirigir
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, MedicoBottomNavComponent]
})
export class PerfilPage implements OnInit {

  // Edu: se inyecta AuthService para cerrar sesión y Router para redirigir al login
  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {
  }

  // Edu: cierra la sesión del médico y redirige al login
  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

}
