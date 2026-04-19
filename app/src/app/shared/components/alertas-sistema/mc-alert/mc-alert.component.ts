import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-mc-alert',
  templateUrl: './mc-alert.component.html',
  styleUrls: ['./mc-alert.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class McAlertComponent {
  private modalCtrl = inject(ModalController);

  @Input() titulo: string = 'Alerta';
  @Input() mensaje: string = '';
  @Input() btnCancelar: string = 'Cancelar';
  @Input() btnConfirmar: string = 'Confirmar';
  @Input() colorConfirmar: 'primary' | 'danger' = 'primary';
  @Input() icono: string = 'warning';

  cancelar() {
    this.modalCtrl.dismiss({ confirmado: false }, 'cancel');
  }

  confirmar() {
    this.modalCtrl.dismiss({ confirmado: true }, 'confirm');
  }
}