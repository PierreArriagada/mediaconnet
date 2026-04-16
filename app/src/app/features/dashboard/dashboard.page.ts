import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonIcon, IonCard,
  IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonBadge, IonGrid, IonRow, IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, calendarOutline, personOutline,
  notificationsOutline, medkitOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

const ROLE_LABEL: Record<string, string> = {
  patient: 'Paciente',
  doctor: 'Médico',
  admin: 'Administrador',
};

const ROLE_COLOR: Record<string, string> = {
  patient: 'primary',
  doctor: 'secondary',
  admin: 'tertiary',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonIcon, IonCard,
    IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonBadge, IonGrid, IonRow, IonCol,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>MediConnect</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()" title="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Tarjeta de bienvenida -->
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>
            Bienvenido/a
            <ion-badge [color]="roleColor" style="margin-left:8px">
              {{ roleLabel }}
            </ion-badge>
          </ion-card-subtitle>
          <ion-card-title>{{ userName }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Esta es tu vista principal. Desde aquí podrás gestionar tus citas
          médicas, revisar tu historial y recibir notificaciones.
        </ion-card-content>
      </ion-card>

      <!-- Accesos rápidos (planificados) -->
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-card [disabled]="true">
              <ion-card-content class="ion-text-center">
                <ion-icon name="calendar-outline" style="font-size:2rem;color:var(--ion-color-primary)" />
                <p>Mis Citas</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card [disabled]="true">
              <ion-card-content class="ion-text-center">
                <ion-icon name="medkit-outline" style="font-size:2rem;color:var(--ion-color-secondary)" />
                <p>Mi Historial</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card [disabled]="true">
              <ion-card-content class="ion-text-center">
                <ion-icon name="notifications-outline" style="font-size:2rem;color:var(--ion-color-warning)" />
                <p>Notificaciones</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card [disabled]="true">
              <ion-card-content class="ion-text-center">
                <ion-icon name="person-outline" style="font-size:2rem;color:var(--ion-color-medium)" />
                <p>Mi Perfil</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

    </ion-content>
  `,
})
export class DashboardPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  userName = '';
  roleLabel = '';
  roleColor = 'primary';

  constructor() {
    addIcons({ logOutOutline, calendarOutline, personOutline, notificationsOutline, medkitOutline });
  }

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.userName = user.name;
      this.roleLabel = ROLE_LABEL[user.role] ?? user.role;
      this.roleColor = ROLE_COLOR[user.role] ?? 'primary';
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}

