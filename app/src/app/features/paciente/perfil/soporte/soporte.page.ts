import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { PacienteHeaderComponent } from '../../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

interface FaqItem { pregunta: string; respuesta: string; abierto: boolean; }

@Component({
  selector: 'app-soporte-paciente',
  templateUrl: './soporte.page.html',
  styleUrls:   ['./soporte.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class SoportePage {
  private readonly router = inject(Router);

  faqs: FaqItem[] = [
    {
      pregunta: '¿Cómo reservo una hora médica?',
      respuesta: 'Ve a la pestaña "Reservar" en la barra inferior, elige una especialidad, selecciona un profesional disponible y confirma tu reserva.',
      abierto: false,
    },
    {
      pregunta: '¿Puedo cancelar o reagendar una cita?',
      respuesta: 'Sí. Ingresa a "Historial" → selecciona la cita confirmada o pendiente → usa las opciones de Cancelar o Reagendar.',
      abierto: false,
    },
    {
      pregunta: '¿Qué debo hacer si olvidé mi contraseña?',
      respuesta: 'En la pantalla de inicio de sesión, presiona "¿Olvidaste tu contraseña?" y sigue las instrucciones enviadas a tu correo.',
      abierto: false,
    },
    {
      pregunta: '¿Cómo actualizo mis datos personales?',
      respuesta: 'En esta sección de Perfil → "Mis datos", puedes editar tu nombre, correo, teléfono y datos de contacto de emergencia.',
      abierto: false,
    },
    {
      pregunta: '¿Con qué modalidades de atención puedo atenderme?',
      respuesta: 'MediConnect ofrece atención presencial y por telemedicina (videollamada). Puedes elegir la modalidad al momento de reservar.',
      abierto: false,
    },
  ];

  toggleFaq(i: number): void {
    this.faqs[i].abierto = !this.faqs[i].abierto;
  }

  volver(): void {
    this.router.navigate(['/paciente/perfil']);
  }
}
