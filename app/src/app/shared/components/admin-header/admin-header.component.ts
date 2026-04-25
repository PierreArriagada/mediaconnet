import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionesAdminStateService } from '../../../core/services/notificaciones-admin-state.service';

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.component.html',
  styleUrls:   ['./admin-header.component.scss'],
  standalone: true,
})
export class AdminHeaderComponent {
  /** Nombre completo del administrador */
  @Input() userName = '';

  /** Cantidad de notificaciones no leídas */
  @Input() noLeidas = 0;

  /** Emite cuando el usuario pulsa el botón de notificaciones */
  @Output() notificacionesClick = new EventEmitter<void>();

  /** Emite cuando el usuario pulsa el botón de ajustes */
  @Output() ajustesClick = new EventEmitter<void>();

  constructor(
    private readonly router: Router,
    private readonly notificacionesState: NotificacionesAdminStateService,
  ) {}

  /** Dos primeras iniciales del nombre completo en mayúsculas */
  get initials(): string {
    return this.userName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get totalNoLeidas(): number {
    return this.notificacionesState.noLeidas() ?? this.noLeidas;
  }

  onNotificaciones(): void {
    this.notificacionesClick.emit();
    this.router.navigate(['/admin', 'notificaciones']);
  }

  onAjustes(): void {
    this.ajustesClick.emit();
    this.router.navigate(['/admin', 'ajustes']);
  }
}
