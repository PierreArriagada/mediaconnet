import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, MedicoHeaderComponent]
})
export class CitasPage implements OnInit {
  private readonly authService = inject(AuthService);

  constructor() { }

  user = this.authService.getCurrentUser();

  ngOnInit() {
  }

}
