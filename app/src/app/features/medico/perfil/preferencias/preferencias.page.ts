import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { MedicoHeaderComponent } from '../../../../shared/components/medico-header/medico-header.component';
import { MedicoBottomNavComponent } from '../../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';

const PREF_KEY = 'mc_prefs_medico';
interface Preferencias { notifCitas: boolean; notifRecordatorio: boolean; }

@Component({
  selector: 'app-preferencias-medico',
  templateUrl: './preferencias.page.html',
  styleUrls:   ['./preferencias.page.scss'],
  standalone: true,
  imports: [IonContent, MedicoHeaderComponent, MedicoBottomNavComponent],
})
export class PreferenciasMedicoPage implements OnInit {
  private readonly router = inject(Router);
  prefs: Preferencias = { notifCitas: true, notifRecordatorio: true };
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

  volver(): void { this.router.navigate(['/medico/perfil']); }
}
