import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';

const PREF_KEY = 'mc_prefs_admin';
interface Preferencias { notifSolicitudes: boolean; notifAlertas: boolean; }

@Component({
  selector: 'app-preferencias-admin',
  templateUrl: './preferencias.page.html',
  styleUrls:   ['./preferencias.page.scss'],
  standalone: true,
  imports: [IonContent, AdminHeaderComponent, AdminBottomNavComponent],
})
export class PreferenciasAdminPage implements OnInit {
  private readonly router = inject(Router);
  prefs: Preferencias = { notifSolicitudes: true, notifAlertas: true };
  guardado = false;

  ngOnInit(): void {
    const stored = localStorage.getItem(PREF_KEY);
    if (stored) {
      try { this.prefs = { ...this.prefs, ...JSON.parse(stored) }; } catch { /* ignore */ }
    }
  }

  toggle(key: keyof Preferencias): void {
    this.prefs[key] = !this.prefs[key];
    localStorage.setItem(PREF_KEY, JSON.stringify(this.prefs));
    this.guardado = true;
    setTimeout(() => { this.guardado = false; }, 2000);
  }

  volver(): void { this.router.navigate(['/admin/perfil']); }
}
