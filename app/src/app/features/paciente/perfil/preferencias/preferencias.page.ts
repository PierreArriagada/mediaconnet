import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { PacienteHeaderComponent } from '../../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';

const PREF_KEY = 'mc_prefs_paciente';

interface Preferencias {
  notifCitas:       boolean;
  notifRecordatorio: boolean;
  notifPromos:      boolean;
}

@Component({
  selector: 'app-preferencias-paciente',
  templateUrl: './preferencias.page.html',
  styleUrls:   ['./preferencias.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    PacienteHeaderComponent,
    PacienteBottomNavComponent,
  ],
})
export class PreferenciasPage implements OnInit {
  private readonly router = inject(Router);

  prefs: Preferencias = {
    notifCitas:        true,
    notifRecordatorio: true,
    notifPromos:       false,
  };

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
    this.mostrarGuardado();
  }

  volver(): void {
    this.router.navigate(['/paciente/perfil']);
  }

  private mostrarGuardado(): void {
    this.guardado = true;
    setTimeout(() => { this.guardado = false; }, 2000);
  }
}
