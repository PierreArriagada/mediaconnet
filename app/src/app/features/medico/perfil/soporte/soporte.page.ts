import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { MedicoHeaderComponent } from '../../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

interface FaqItem { pregunta: string; respuesta: string; abierto: boolean; }

@Component({
  selector: 'app-soporte-medico',
  templateUrl: './soporte.page.html',
  styleUrls:   ['./soporte.page.scss'],
  standalone: true,
  imports: [IonContent, MedicoHeaderComponent, MedicoBottomNavComponent],
})
export class SoporteMedicoPage {
  private readonly router = inject(Router);

  faqs: FaqItem[] = [
    { pregunta: '¿Cómo registro mi disponibilidad?', respuesta: 'Ve a la sección Agenda y selecciona los bloques horarios en los que puedes atender. Pulsa Guardar para confirmar.', abierto: false },
    { pregunta: '¿Cómo marco la asistencia de un paciente?', respuesta: 'En tu agenda del día, selecciona la cita y elige el estado: Atendido, No asistió u otro. Esto queda registrado en el historial.', abierto: false },
    { pregunta: '¿Cómo accedo a la ficha de un paciente?', respuesta: 'Desde la cita en tu agenda o buscando al paciente en la sección correspondiente. Solo ves pacientes asignados a ti.', abierto: false },
    { pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a Perfil → Seguridad e ingresa tu contraseña actual y la nueva. Confirma el cambio y quedará actualizado de inmediato.', abierto: false },
    { pregunta: '¿Qué hago si hay un problema técnico?', respuesta: 'Escríbenos a soporte@mediconnect.cl con una descripción del problema, el error que ves y el horario en que ocurrió.', abierto: false },
  ];

  toggleFaq(i: number): void { this.faqs[i].abierto = !this.faqs[i].abierto; }
  volver(): void { this.router.navigate(['/medico/perfil']); }
}
