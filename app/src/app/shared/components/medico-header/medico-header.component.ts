import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionesMedicoStateService } from '../../../core/services/notificaciones-medico-state.service';

@Component({
  selector: 'app-medico-header',
  templateUrl: './medico-header.component.html',
  styleUrls:   ['./medico-header.component.scss'],
  standalone: true,
})
export class MedicoHeaderComponent {
  /** Nombre completo del médico — se usa para calcular las iniciales */
  @Input() userName = '';

  /** Cantidad de notificaciones no leídas */
  @Input() noLeidas = 0;

  /** Emite cuando el usuario pulsa el botón de notificaciones */
  @Output() notificacionesClick = new EventEmitter<void>();

  constructor(
    private readonly router: Router,
    private readonly notificacionesState: NotificacionesMedicoStateService,
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
    this.router.navigate(['/medico', 'notificaciones']);
  }
}
