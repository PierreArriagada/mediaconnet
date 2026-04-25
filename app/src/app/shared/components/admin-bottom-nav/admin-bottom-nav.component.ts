import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export type AdminNavTab = 'home' | 'medicos' | 'pacientes' | 'operacion' | 'auditoria';

@Component({
  selector: 'app-admin-bottom-nav',
  templateUrl: './admin-bottom-nav.component.html',
  styleUrls:   ['./admin-bottom-nav.component.scss'],
  standalone: true,
})
export class AdminBottomNavComponent {
  /** Pestaña activa — se pasa desde la página contenedora */
  @Input() activeTab: AdminNavTab | null = 'home';

  constructor(private readonly router: Router) {}

  ir(tab: AdminNavTab): void {
    this.router.navigate(['/admin', tab]);
  }
}
