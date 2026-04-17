import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export type PacienteNavTab = 'home' | 'reservar' | 'historial' | 'perfil';

@Component({
  selector: 'app-paciente-bottom-nav',
  templateUrl: './paciente-bottom-nav.component.html',
  styleUrls:   ['./paciente-bottom-nav.component.scss'],
  standalone: true,
})
export class PacienteBottomNavComponent {
  /** Pestaña activa actualmente — se pasa desde la página contenedora */
  @Input() activeTab: PacienteNavTab = 'home';

  constructor(private readonly router: Router) {}

  ir(tab: PacienteNavTab): void {
    this.router.navigate(['/paciente', tab]);
  }
}
