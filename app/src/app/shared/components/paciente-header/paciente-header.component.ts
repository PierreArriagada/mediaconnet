import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-paciente-header',
  templateUrl: './paciente-header.component.html',
  styleUrls:   ['./paciente-header.component.scss'],
  standalone: true,
})
export class PacienteHeaderComponent {
  /** Nombre completo del usuario — se usa para calcular las iniciales */
  @Input() userName = '';

  /** Cantidad de notificaciones no leídas — muestra el badge si > 0 */
  @Input() noLeidas = 0;

  /** Emite cuando el usuario pulsa el botón de notificaciones */
  @Output() notificacionesClick = new EventEmitter<void>();

  constructor(private readonly router: Router) {}

  /** Dos primeras iniciales del nombre completo en mayúsculas */
  get initials(): string {
    return this.userName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  onNotificaciones(): void {
    this.notificacionesClick.emit();
    this.router.navigate(['/paciente', 'notificaciones']);
  }
}
