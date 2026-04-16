import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register',
  template: `
    <ion-content class="ion-padding ion-text-center">
      <h2>Registro</h2>
      <p>Página de registro — próximamente.</p>
      <ion-button [routerLink]="['/auth/login']">
        Volver al Login
      </ion-button>
    </ion-content>
  `,
  standalone: true,
  imports: [IonButton, IonContent, RouterLink],
})
export class RegisterPage {}
