import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, MedicoHeaderComponent]
})
export class NotificacionesPage implements OnInit {
  private readonly authService = inject(AuthService);

  user = this.authService.getCurrentUser();

  ngOnInit() {
  }

}
