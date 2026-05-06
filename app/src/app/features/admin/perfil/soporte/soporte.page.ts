import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

interface FaqItem { pregunta: string; respuesta: string; abierto: boolean; }

@Component({
  selector: 'app-soporte-admin',
  templateUrl: './soporte.page.html',
  styleUrls:   ['./soporte.page.scss'],
  standalone: true,
  imports: [IonContent, AdminHeaderComponent, AdminBottomNavComponent],
})
export class SoporteAdminPage {
  private readonly router = inject(Router);

  faqs: FaqItem[] = [
    { pregunta: '¿Cómo creo un nuevo médico?', respuesta: 'Ve a Gestión de médicos y utiliza el botón "Nuevo médico". Completa el formulario con los datos requeridos, incluyendo especialidad y número de registro.', abierto: false },
    { pregunta: '¿Cómo gestiono solicitudes de invitados?', respuesta: 'En la sección Solicitudes encontrarás las peticiones pendientes. Puedes aprobar o rechazar cada una con los botones correspondientes.', abierto: false },
    { pregunta: '¿Cómo cambio el estado laboral de un médico?', respuesta: 'Desde la ficha del médico en Gestión de médicos, selecciona el estado deseado (Activo, Inactivo, Vacaciones) y guarda el cambio.', abierto: false },
    { pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a Perfil → Seguridad e ingresa tu contraseña actual y la nueva. El cambio se aplica de inmediato.', abierto: false },
    { pregunta: '¿Qué hago si hay un problema técnico?', respuesta: 'Contacta al equipo técnico en soporte@mediconnect.cl describiendo el error, el módulo afectado y la hora de ocurrencia.', abierto: false },
  ];

  toggleFaq(i: number): void { this.faqs[i].abierto = !this.faqs[i].abierto; }
  volver(): void { this.router.navigate(['/admin/perfil']); }
}
