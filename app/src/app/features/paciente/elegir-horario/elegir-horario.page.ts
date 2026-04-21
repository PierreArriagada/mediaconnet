import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonToast } from '@ionic/angular/standalone';
import { PacienteService, DisponibilidadMedicoData, DisponibilidadSlot } from '../../../core/services/paciente.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteHeaderComponent } from '../../../shared/components/paciente-header/paciente-header.component';
import { PacienteBottomNavComponent } from '../../../shared/components/paciente-bottom-nav/paciente-bottom-nav.component';
import { AuthService } from '../../../core/services/auth.service';

interface DiaCalendario {
  dia:        number;
  fecha:      string;     // YYYY-MM-DD
  disponible: boolean;
  hoy:        boolean;
  fuera:      boolean;    // fuera del mes actual
}

@Component({
  standalone: true,
  selector: 'app-elegir-horario',
  templateUrl: './elegir-horario.page.html',
  styleUrls: ['./elegir-horario.page.scss'],
  imports: [CommonModule, IonContent, IonToast, PacienteHeaderComponent, PacienteBottomNavComponent],
})
export default class ElegirHorarioPage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly svc     = inject(PacienteService);
  private readonly authSvc = inject(AuthService);
  private readonly notificacionesState = inject(NotificacionesPacienteStateService);

  data: DisponibilidadMedicoData | null = null;
  isLoading = true;
  showError = false;
  errorMsg  = '';

  userName = '';
  noLeidas = 0;

  // Calendario
  mesActual      = signal(new Date());
  diasCalendario = signal<DiaCalendario[]>([]);
  diasSemana     = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Selecciones
  fechaSeleccionada = signal<string>('');
  slotSeleccionado  = signal<DisponibilidadSlot | null>(null);

  // Disponibilidad indexada por fecha
  private dispPorFecha = new Map<string, DisponibilidadSlot[]>();
  private fechasDisponibles = new Set<string>();

  ngOnInit(): void {
    const user = this.authSvc.getCurrentUser();
    this.userName = user?.name ?? '';

    const idMedico = Number(this.route.snapshot.paramMap.get('idMedico'));
    if (!idMedico || idMedico < 1) {
      this.router.navigate(['/paciente/reservar']);
      return;
    }

    this.svc.getDisponibilidadMedico(idMedico).subscribe({
      next: (res) => {
        this.data     = res;
        this.noLeidas = res.noLeidas;
        this.notificacionesState.setNoLeidas(res.noLeidas);
        this.indexarDisponibilidad(res.disponibilidad);
        this.generarCalendario();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg  = 'No se pudo cargar la disponibilidad.';
        this.showError = true;
        this.isLoading = false;
      },
    });
  }

  volver(): void {
    window.history.back();
  }

  // ── Navegación del calendario ───────────────
  mesAnterior(): void {
    const m = new Date(this.mesActual());
    m.setMonth(m.getMonth() - 1);
    this.mesActual.set(m);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    const m = new Date(this.mesActual());
    m.setMonth(m.getMonth() + 1);
    this.mesActual.set(m);
    this.generarCalendario();
  }

  nombreMes(): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const m = this.mesActual();
    return `${meses[m.getMonth()]} ${m.getFullYear()}`;
  }

  // ── Selección de fecha y slot ───────────────
  seleccionarFecha(dia: DiaCalendario): void {
    if (!dia.disponible) return;
    this.fechaSeleccionada.set(dia.fecha);
    this.slotSeleccionado.set(null);
  }

  slotsDelDia(): DisponibilidadSlot[] {
    return this.dispPorFecha.get(this.fechaSeleccionada()) ?? [];
  }

  slotsManana(): DisponibilidadSlot[] {
    return this.slotsDelDia().filter(s => parseInt(s.hora_inicio, 10) < 12);
  }

  slotsTarde(): DisponibilidadSlot[] {
    return this.slotsDelDia().filter(s => parseInt(s.hora_inicio, 10) >= 12);
  }

  seleccionarSlot(slot: DisponibilidadSlot): void {
    this.slotSeleccionado.set(slot);
  }

  confirmarCita(): void {
    const slot = this.slotSeleccionado();
    if (!slot || !this.data) return;
    // Navegar a confirmar reserva pasando datos por queryParams
    this.router.navigate(['/paciente/confirmar-reserva', slot.id_disponibilidad], {
      queryParams: {
        idMedico:       this.data.medico.id_medico,
        idEspecialidad: this.data.medico.id_especialidad,
        nombre:         this.data.medico.nombre,
        apellido:       this.data.medico.apellido,
        especialidad:   this.data.medico.nombre_especialidad,
        fecha:          slot.fecha,
        horaInicio:     slot.hora_inicio,
        horaFin:        slot.hora_fin,
      },
    });
  }

  // ── Helpers ─────────────────────────────────
  iniciales(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  temaAvatar(id: number): string {
    const temas = ['primary', 'tertiary', 'secondary'];
    return temas[id % temas.length];
  }

  titulo(nombre: string): string {
    return nombre.endsWith('a') ? 'Dra.' : 'Dr.';
  }

  formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  formatFechaCorta(fechaStr: string): string {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} ${meses[m - 1]} ${y}`;
  }

  // ── Internos ────────────────────────────────
  private indexarDisponibilidad(slots: DisponibilidadSlot[]): void {
    for (const s of slots) {
      this.fechasDisponibles.add(s.fecha);
      if (!this.dispPorFecha.has(s.fecha)) this.dispPorFecha.set(s.fecha, []);
      this.dispPorFecha.get(s.fecha)!.push(s);
    }
  }

  private generarCalendario(): void {
    const m     = this.mesActual();
    const year  = m.getFullYear();
    const month = m.getMonth();
    const hoy   = new Date();
    hoy.setHours(0, 0, 0, 0);

    const primerDia   = new Date(year, month, 1);
    const ultimoDia   = new Date(year, month + 1, 0);

    // Día de la semana del primer día (lunes=0)
    let diaInicio = primerDia.getDay() - 1;
    if (diaInicio < 0) diaInicio = 6;

    const dias: DiaCalendario[] = [];

    // Días del mes anterior para rellenar
    const mesAnt    = new Date(year, month, 0);
    const diasMesAnt = mesAnt.getDate();
    for (let i = diaInicio - 1; i >= 0; i--) {
      const d = diasMesAnt - i;
      const f = this.isoDate(year, month - 1, d);
      dias.push({ dia: d, fecha: f, disponible: false, hoy: false, fuera: true });
    }

    // Días del mes actual
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const f = this.isoDate(year, month, d);
      const fechaObj = new Date(year, month, d);
      dias.push({
        dia:        d,
        fecha:      f,
        disponible: this.fechasDisponibles.has(f) && fechaObj >= hoy,
        hoy:        fechaObj.getTime() === hoy.getTime(),
        fuera:      false,
      });
    }

    // Rellenar hasta completar semanas
    const restante = 7 - (dias.length % 7);
    if (restante < 7) {
      for (let d = 1; d <= restante; d++) {
        const f = this.isoDate(year, month + 1, d);
        dias.push({ dia: d, fecha: f, disponible: false, hoy: false, fuera: true });
      }
    }

    this.diasCalendario.set(dias);
  }

  private isoDate(year: number, month: number, day: number): string {
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
