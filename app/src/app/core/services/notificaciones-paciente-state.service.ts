import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificacionesPacienteStateService {
  private readonly _noLeidas = signal<number | null>(null);
  private readonly _fueronLimpiadas = signal(false);

  readonly noLeidas = this._noLeidas.asReadonly();
  readonly fueronLimpiadas = this._fueronLimpiadas.asReadonly();

  setNoLeidas(total: number): void {
    const totalSeguro = Math.max(0, Number.isFinite(total) ? total : 0);
    this._noLeidas.set(totalSeguro);

    if (totalSeguro > 0) {
      this._fueronLimpiadas.set(false);
    }
  }

  limpiarBadge(): void {
    this._noLeidas.set(0);
  }

  registrarLimpiezaTotal(): void {
    this._noLeidas.set(0);
    this._fueronLimpiadas.set(true);
  }

  reiniciar(): void {
    this._noLeidas.set(null);
    this._fueronLimpiadas.set(false);
  }
}