import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { MedicoBottomNavComponent } from '../../../shared/components/medico-bottom-nav/medico-bottom-nav.component';
import { MedicoHeaderComponent } from '../../../shared/components/medico-header/medico-header.component';
import { AuthService } from '../../../core/services/auth.service';
import {
  CitaMedico,
  CitasMedicoData,
  MedicoService,
} from '../../../core/services/medico.service';
import { formatFechaCorta, formatFechaDiaMesAnio, formatFechaLargaConDia, formatMesAnio } from '../../../shared/utils/fecha.utils';

type VistaAgenda= 'dia' | 'semana'| 'mes';

interface DiaAgenda{
  fecha: string;
  etiquetaDia: string;
  numeroDia: string;
  esHoy: boolean;
  esSeleccionado:boolean;
  cantidadCitas: number;
  cantidadSlots: number; 


}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    MedicoBottomNavComponent,
    MedicoHeaderComponent
  ]
})
export class AgendaPage implements OnInit {
  private readonly router = inject(Router);
  private readonly medicoService = inject(MedicoService);
  private readonly authService = inject(AuthService);

  user = this.authService.getCurrentUser();
  citasHoy: CitaMedico[] = [];
  citasProximas: CitaMedico[] = [];
  isLoading = true;
  errorMessage = '';
  vistaActiva: VistaAgenda = 'semana';
  fechaSeleccionada = this.toISODate(new Date());

  ngOnInit() {
    this.cargarAgenda();
  }

get periodoTitulo(): string {
  const fecha = this.parseISODate(this.fechaSeleccionada);

  if (this.vistaActiva === 'dia') {
    return formatFechaLargaConDia(this.fechaSeleccionada);
  }

  if (this.vistaActiva === 'mes') {
    return formatMesAnio(fecha);
  }

  const inicio = this.inicioSemana(fecha);
  const fin = this.sumarDias(inicio, 6);
  return `${formatFechaCorta(this.toISODate(inicio))} - ${formatFechaDiaMesAnio(this.toISODate(fin))}`;
}

  // Edu: carga agenda médica combinando citas pendientes de asistencia y próximas citas.
  cargarAgenda() {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getCitasParaMarcar().subscribe({
      next: (data: CitasMedicoData) => {
        this.citasHoy = data.citas ?? [];
        this.cargarCitasProximas();
      },
      error: () => {
        this.citasHoy = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar la agenda médica.';
      }
    });
  }

  // Edu: carga las próximas citas del profesional autenticado.
  private cargarCitasProximas() {
    this.medicoService.getCitasProximas().subscribe({
      next: (data: CitasMedicoData) => {
        this.citasProximas = data.citas ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.citasProximas = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar las próximas citas.';
      }
    });
  }

  // Edu: permite refrescar manualmente la agenda desde la vista.
  refrescarAgenda() {
    this.cargarAgenda();
  }

  // Edu: acceso directo a ficha clínica desde una cita de la agenda.
  verFichaPaciente(idPaciente?: number) {
    if (!idPaciente) {
      return;
    }

    this.router.navigate(['/medico/pacientes', idPaciente, 'ficha']);
  }

  private inicioSemana(fecha: Date): Date {
    const copia = new Date(fecha);
    const dia = copia.getDay();
    const distanciaAlLunes = dia === 0 ? -6 : 1 - dia;
    return this.sumarDias(copia, distanciaAlLunes);
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  private parseISODate(fechaISO: string): Date {
    return new Date(`${fechaISO.split('T')[0]}T00:00:00`);
  }

  private toISODate(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}




