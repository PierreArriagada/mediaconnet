import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { AdminBottomNavComponent } from '../../../../shared/components/admin-bottom-nav/admin-bottom-nav.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  esHoy,
  formatFechaLargaConDia,
  formatMesAnio,
  formatFechaCorta,
  formatFechaDiaMesAnio,
  formatHoraCorta,
} from '../../../../shared/utils/fecha.utils';
import {
  AdminService,
  MedicoListItem,
  DisponibilidadAdminBloque,
} from '../../../../core/services/admin.service';

type VistaAgenda = 'semana' | 'mes';
type EstadoDisponibilidad = 'disponible' | 'reservada' | 'bloqueada';

interface DiaAgenda {
  fecha: string;
  etiquetaDia: string;
  numeroDia: string;
  esHoy: boolean;
  esSeleccionado: boolean;
  cantidadSlots: number;
}

interface BloqueForm {
  horaInicio: string;
  horaFin: string;
}

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.page.html',
  styleUrls:   ['./horarios.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    AdminHeaderComponent,
    AdminBottomNavComponent,
  ],
})
export class HorariosPage implements OnInit {
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  user = this.auth.getCurrentUser();

  // ── Selector de médico ─────────────────────────────────────────────────────
  medicos: MedicoListItem[] = [];
  medicoSeleccionadoId: number | null = null;
  terminoBusqueda = '';
  cargandoMedicos = false;

  // ── Disponibilidad del médico seleccionado ─────────────────────────────────
  disponibilidad: DisponibilidadAdminBloque[] = [];
  cargandoDisponibilidad = false;
  feedbackMessage = '';
  bloqueEditandoId: number | null = null;

  // ── Calendario ─────────────────────────────────────────────────────────────
  vistaActiva: VistaAgenda = 'semana';
  fechaSeleccionada = this.toISODate(new Date());

  // ── Editor de bloques (visible al seleccionar un día) ──────────────────────
  readonly diasConfigurables = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ];
  diasActivos = [1, 2, 3, 4, 5];
  jornadaManana = true;
  jornadaTarde = false;
  bloquesForm: BloqueForm[] = [{ horaInicio: '08:00', horaFin: '10:30' }];
  repetirSemanas = 1;

  ngOnInit(): void {
    this.cargarMedicos();
  }

  // ── Carga de médicos ───────────────────────────────────────────────────────

  cargarMedicos(): void {
    this.cargandoMedicos = true;
    this.adminService.getMedicos().subscribe({
      next: (lista) => {
        this.medicos = lista;
        this.cargandoMedicos = false;
      },
      error: () => {
        this.cargandoMedicos = false;
        this.feedbackMessage = 'No fue posible cargar la lista de médicos.';
      },
    });
  }

  // ── Selector ───────────────────────────────────────────────────────────────

  get medicosFiltrados(): MedicoListItem[] {
    const t = this.terminoBusqueda.toLowerCase().trim();
    if (!t) { return this.medicos; }
    return this.medicos.filter(
      (m) =>
        m.nombre.toLowerCase().includes(t) ||
        m.apellido.toLowerCase().includes(t) ||
        m.especialidad.toLowerCase().includes(t),
    );
  }

  get medicoActual(): MedicoListItem | undefined {
    return this.medicos.find((m) => m.id_medico === this.medicoSeleccionadoId);
  }

  seleccionarMedico(id: number): void {
    this.medicoSeleccionadoId = id;
    this.terminoBusqueda = '';
    this.disponibilidad = [];
    this.feedbackMessage = '';
    this.cargarDisponibilidad();
  }

  // ── Calendario ─────────────────────────────────────────────────────────────

  get periodoTitulo(): string {
    const fecha = this.parseISODate(this.fechaSeleccionada);
    if (this.vistaActiva === 'mes') {
      return formatMesAnio(fecha);
    }
    const inicio = this.inicioSemana(fecha);
    const fin = this.sumarDias(inicio, 6);
    return `${formatFechaCorta(this.toISODate(inicio))} - ${formatFechaDiaMesAnio(this.toISODate(fin))}`;
  }

  get diasDelPeriodo(): DiaAgenda[] {
    const inicio = this.inicioSemana(this.parseISODate(this.fechaSeleccionada));
    return Array.from({ length: 7 }, (_, i) => {
      const d     = this.sumarDias(inicio, i);
      const fecha = this.toISODate(d);
      return {
        fecha,
        etiquetaDia:    d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '').toUpperCase(),
        numeroDia:      d.toLocaleDateString('es-CL', { day: '2-digit' }),
        esHoy:          esHoy(fecha),
        esSeleccionado: fecha === this.fechaSeleccionada,
        cantidadSlots:  this.disponibilidad.filter((s) => s.fecha === fecha).length,
      };
    });
  }

  get disponibilidadDelDia(): DisponibilidadAdminBloque[] {
    return this.disponibilidad
      .filter((s) => s.fecha === this.fechaSeleccionada)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }

  cambiarVista(vista: VistaAgenda): void {
    this.vistaActiva = vista;
    this.cargarDisponibilidad();
  }

  seleccionarDia(fecha: string): void {
    this.fechaSeleccionada = fecha;
    this.bloquesForm = [{ horaInicio: '08:00', horaFin: '10:30' }];
    this.bloqueEditandoId = null;
    this.feedbackMessage = '';
  }

  moverPeriodo(direccion: -1 | 1): void {
    const fecha = this.parseISODate(this.fechaSeleccionada);
    const salto = this.vistaActiva === 'mes' ? 30 : 7;
    this.fechaSeleccionada = this.toISODate(this.sumarDias(fecha, salto * direccion));
    this.cargarDisponibilidad();
  }

  // ── Panel de horario del día ───────────────────────────────────────────────

  toggleDia(dia: number): void {
    this.diasActivos = this.diasActivos.includes(dia)
      ? this.diasActivos.filter((d) => d !== dia)
      : [...this.diasActivos, dia];
  }

  diaActivo(dia: number): boolean {
    return this.diasActivos.includes(dia);
  }

  agregarBloqueForm(): void {
    this.bloquesForm = [...this.bloquesForm, { horaInicio: '09:00', horaFin: '10:00' }];
  }

  eliminarBloqueForm(index: number): void {
    this.bloquesForm = this.bloquesForm.filter((_, i) => i !== index);
  }

  guardarDisponibilidad(): void {
    if (!this.medicoSeleccionadoId) { return; }
    if (!this.bloquesFormValidos()) {
      this.feedbackMessage = 'La hora fin debe ser posterior a la hora inicio en cada bloque.';
      return;
    }
    const fechas = this.fechasParaCrear();
    const nuevos: Partial<DisponibilidadAdminBloque>[] = [];
    fechas.forEach((fecha) => {
      this.bloquesForm.forEach((bloque) => {
        if (!this.existeBloque(fecha, bloque.horaInicio, bloque.horaFin)) {
          nuevos.push({ fecha, hora_inicio: bloque.horaInicio, hora_fin: bloque.horaFin, estado: 'disponible' });
        }
      });
    });
    if (nuevos.length === 0) {
      this.feedbackMessage = 'No se crearon bloques: ya existían en esos rangos.';
      return;
    }
    this.adminService.crearDisponibilidad(this.medicoSeleccionadoId, nuevos).subscribe({
      next: (creados) => {
        this.disponibilidad = [...this.disponibilidad, ...creados];
        this.feedbackMessage = `${creados.length} bloque(s) creados correctamente.`;
        this.bloqueEditandoId = null;
      },
      error: () => { this.feedbackMessage = 'No fue posible guardar los bloques.'; },
    });
  }

  editarBloque(slot: DisponibilidadAdminBloque): void {
    this.bloqueEditandoId = slot.id_disponibilidad;
    this.bloquesForm = [{ horaInicio: slot.hora_inicio, horaFin: slot.hora_fin }];
    this.feedbackMessage = 'Editando bloque existente. Ajusta el rango y guarda.';
  }

  cancelarEdicion(): void {
    this.bloqueEditandoId = null;
    this.feedbackMessage = '';
    this.bloquesForm = [{ horaInicio: '08:00', horaFin: '10:30' }];
  }

  alternarBloqueo(slot: DisponibilidadAdminBloque): void {
    if (slot.estado === 'reservada') {
      this.feedbackMessage = 'No se puede bloquear una reserva sin resolver primero la cita.';
      return;
    }
    const nuevoEstado: EstadoDisponibilidad = slot.estado === 'bloqueada' ? 'disponible' : 'bloqueada';
    this.adminService.actualizarDisponibilidad(slot.id_disponibilidad, {
      fecha: slot.fecha, hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin, estado: nuevoEstado,
    }).subscribe({
      next: (actualizado) => {
        this.disponibilidad = this.disponibilidad.map((item) =>
          item.id_disponibilidad !== slot.id_disponibilidad ? item : actualizado
        );
        this.feedbackMessage = nuevoEstado === 'bloqueada' ? 'Bloque bloqueado.' : 'Bloque desbloqueado.';
      },
      error: () => { this.feedbackMessage = 'No fue posible actualizar el estado del bloque.'; },
    });
  }

  eliminarBloque(slot: DisponibilidadAdminBloque): void {
    if (slot.estado === 'reservada') {
      this.feedbackMessage = 'No se puede eliminar una disponibilidad con cita reservada.';
      return;
    }
    this.adminService.eliminarDisponibilidad(slot.id_disponibilidad).subscribe({
      next: () => {
        this.disponibilidad = this.disponibilidad.filter(
          (item) => item.id_disponibilidad !== slot.id_disponibilidad
        );
        this.feedbackMessage = 'Bloque eliminado correctamente.';
      },
      error: () => { this.feedbackMessage = 'No fue posible eliminar el bloque.'; },
    });
  }

  cargarDisponibilidad(): void {
    if (!this.medicoSeleccionadoId) { return; }
    const inicio = this.toISODate(this.inicioSemana(this.parseISODate(this.fechaSeleccionada)));
    const fin    = this.toISODate(this.sumarDias(this.parseISODate(inicio), this.vistaActiva === 'mes' ? 29 : 6));
    this.cargandoDisponibilidad = true;
    this.adminService.getDisponibilidad(this.medicoSeleccionadoId, inicio, fin).subscribe({
      next: (data) => {
        this.disponibilidad = data;
        this.cargandoDisponibilidad = false;
      },
      error: () => {
        this.feedbackMessage = 'No fue posible cargar la disponibilidad del servidor.';
        this.cargandoDisponibilidad = false;
      },
    });
  }

  // ── Formato ────────────────────────────────────────────────────────────────

  formatFechaSlot(fechaISO: string | null | undefined): string {
    return formatFechaLargaConDia(fechaISO);
  }

  formatHora(hora: string | null | undefined): string {
    return formatHoraCorta(hora);
  }

  volverOperacion(): void {
    this.router.navigate(['/admin/operacion']);
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private parseISODate(iso: string): Date {
    const [y, m, day] = iso.split('-').map(Number);
    return new Date(y, m - 1, day);
  }

  private inicioSemana(d: Date): Date {
    const c   = new Date(d);
    const dow = c.getDay();
    c.setDate(c.getDate() + (dow === 0 ? -6 : 1 - dow));
    return c;
  }

  private sumarDias(d: Date, n: number): Date {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  }

  private bloquesFormValidos(): boolean {
    return this.bloquesForm.every((b) => this.minutos(b.horaFin) > this.minutos(b.horaInicio));
  }

  private minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private existeBloque(fecha: string, horaInicio: string, horaFin: string): boolean {
    return this.disponibilidad.some(
      (s) => s.fecha === fecha && s.hora_inicio === horaInicio && s.hora_fin === horaFin
    );
  }

  private fechasParaCrear(): string[] {
    const inicio  = this.inicioSemana(this.parseISODate(this.fechaSeleccionada));
    const semanas = Math.max(1, Number(this.repetirSemanas) || 1);
    const dias    = this.diasActivos.length > 0
      ? this.diasActivos
      : [this.parseISODate(this.fechaSeleccionada).getDay()];
    const fechas: string[] = [];
    for (let s = 0; s < semanas; s++) {
      dias.forEach((dia) => {
        const base = this.sumarDias(inicio, s * 7);
        fechas.push(this.toISODate(this.sumarDias(base, dia === 0 ? 6 : dia - 1)));
      });
    }
    return [...new Set(fechas)].sort();
  }
}
