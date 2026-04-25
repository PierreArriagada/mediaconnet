import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export type MedicoNavTab = 'home' | 'agenda' | 'pacientes' | 'perfil';

@Component({
  selector: 'app-medico-bottom-nav',
  templateUrl: './medico-bottom-nav.component.html',
  styleUrls:   ['./medico-bottom-nav.component.scss'],
  standalone: true,
})
export class MedicoBottomNavComponent {
  /** Pestaña activa — se pasa desde la página contenedora */
  @Input() activeTab: MedicoNavTab | null = 'home';

  constructor(private readonly router: Router) {}

  ir(tab: MedicoNavTab): void {
    this.router.navigate(['/medico', tab]);
  }
}
