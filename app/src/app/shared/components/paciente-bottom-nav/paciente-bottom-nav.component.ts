import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type PacienteNavTab = 'home' | 'reservar' | 'historial' | 'perfil';

@Component({
  selector: 'app-paciente-bottom-nav',
  templateUrl: './paciente-bottom-nav.component.html',
  styleUrls:   ['./paciente-bottom-nav.component.scss'],
  standalone: true,
  imports: [RouterLink],
})
export class PacienteBottomNavComponent {
  /** Pestaña activa actualmente — se pasa desde la página contenedora */
  @Input() activeTab: PacienteNavTab | null = 'home';
}
