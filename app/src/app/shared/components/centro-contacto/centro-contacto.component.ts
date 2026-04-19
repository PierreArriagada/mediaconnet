import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-centro-contacto',
  templateUrl: './centro-contacto.component.html',
  styleUrls: ['./centro-contacto.component.scss'],
  standalone: true,
})
export class CentroContactoComponent {
  @Input() titulo    = 'Contacto del centro';
  @Input() direccion = 'Centro Médico MediConnect, Santiago';
  @Input() telefono  = '+56 2 2345 6789';
}
