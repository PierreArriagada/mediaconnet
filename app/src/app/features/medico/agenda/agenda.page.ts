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

type VistaAgenda = 'dia' | 'semana' | 'mes'; // Solo 'semana' y 'mes' están implementadas visualmente
// Opciones válidas para el filtro de estado de cita. Sirve para autocompletar y evitar strings sueltos.
type EstadoFiltro = 'todos' | 'pendiente' | 'confirmada' | 'cancelada' | 'reprogramada' | 'completada';
// Opciones válidas para el filtro de modalidad
type ModalidadFiltro = 'todas' | 'presencial' | 'telemedicina';

// Interfaz para renderizar cada día en el componente de calendario (strip semanal)
interface DiaAgenda {
  fecha: string; // Formato YYYY-MM-DD
  etiquetaDia: string; // Ej: "LUN", "MAR"
  numeroDia: string; // Ej: "24"
  esHoy: boolean; // Pinta el día distinto si coincide con la fecha actual
  esSeleccionado: boolean; // Pinta el día distinto si el usuario lo clica
  cantidadCitas: number; // Placeholder para cuando hagamos match con datos
  cantidadSlots: number; // Placeholder para cuando hagamos match con disponibilidad
}

// Estados posibles de un bloque de disponibilidad médica.
// 'disponible' = el médico puede recibir citas en ese horario.
// 'reservada'  = ya hay una cita asignada (no se puede eliminar sin cancelar la cita antes).
// 'bloqueada'  = el médico cerró ese espacio (reunión, almuerzo, etc.).
type EstadoDisponibilidad = 'disponible' | 'reservada' | 'bloqueada';

// Representa un bloque de disponibilidad tal como viene (o irá) al backend.
// Imita la tabla `disponibilidad_medica` de la base de datos.
interface BloqueDisponibilidad {
  id_disponibilidad: number;
  fecha: string;          // YYYY-MM-DD — siempre generado con toISODate() para evitar UTC shift
  hora_inicio: string;    // HH:MM
  hora_fin: string;       // HH:MM
  estado: EstadoDisponibilidad;
  modalidad: 'presencial' | 'telemedicina' | 'mixta';
  nota?: string;          // opcional, uso interno del médico
}

// Representa los campos del formulario de creación de bloques tal como los ingresa el médico.
// Es distinto a BloqueDisponibilidad porque incluye campos de UI (repetirSemanas, diasActivos).
interface FormDisponibilidad {
  fechaInicio: string;    // YYYY-MM-DD — fecha de la primera semana a generar
  horaInicio: string;     // HH:MM
  horaFin: string;        // HH:MM
  repetirSemanas: number; // cuántas semanas hacia adelante replicar el bloque
  estado: EstadoDisponibilidad;
  modalidad: 'presencial' | 'telemedicina' | 'mixta';
  nota: string;
}

// Rango horario editable en el bento grid. Sin fecha ni estado: eso lo maneja guardarDisponibilidad().
interface BloqueForm {
  horaInicio: string; // HH:MM
  horaFin: string;    // HH:MM
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

  // Obtiene el usuario para mostrar su nombre en el header (ej: Dr. Pierre)
  user = this.authService.getCurrentUser();

  // Arreglos de citas obtenidos del backend
  citasHoy: CitaMedico[] = [];
  citasProximas: CitaMedico[] = [];

  // Estado de carga y errores de las llamadas HTTP
  isLoading = true;
  errorMessage = '';

  // Estado de la navegación del calendario (por defecto semana actual)
  vistaActiva: VistaAgenda = 'semana';
  fechaSeleccionada = this.toISODate(new Date()); // Se arranca marcando el día actual en YY-MM-DD

  // Controla la visibilidad del panel de gestión de horario.
  // false = cerrado (por defecto), true = visible en pantalla.
  panelHorarioAbierto = false;

  // ── B2: estado del panel de gestión de horario ──────────────────────────────

  // Bloques de disponibilidad guardados (local hasta que se conecte el backend en E1).
  disponibilidad: BloqueDisponibilidad[] = [];

  // Id del bloque que se está editando. null = ninguno (modo creación).
  bloqueEditandoId: number | null = null;

  // Mensaje de feedback que aparece debajo del botón Guardar.
  feedbackMessage = '';

  // Días de la semana que el médico puede configurar. Se usan como filas con checkbox.
  readonly diasConfigurables = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ];

  // Días activos por defecto: lunes a viernes (caso más común para un médico).
  diasActivos = [1, 2, 3, 4, 5];

  // Toggles de jornada. Mañana activa por defecto.
  jornadaManana = true;
  jornadaTarde = false;

  // Filas editables del editor de bloques horarios. Empieza con una fila predefinida.
  bloquesForm: BloqueForm[] = [
    { horaInicio: '08:00', horaFin: '10:30' },
  ];

  // Cuántas semanas hacia adelante replicar los bloques al guardar.
  repetirSemanas = 1;

  // ────────────────────────────────────────────────────────────────────────────

  // Estado de los filtros visuales manejados con ngModel
  filtroEstado: EstadoFiltro = 'todos';
  filtroModalidad: ModalidadFiltro = 'todas';
  // Texto tipeado en la barra superior ("buscar paciente, etc.")
  terminoBusqueda = '';

  // Arrays inmutables para poblar los tags del HTML limpio (evita repetir <option> por cada valor).
  readonly estadosCita: Array<{ value: EstadoFiltro; label: string }> = [
    { value: 'todos', label: 'Todas' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'confirmada', label: 'Confirmadas' },
    { value: 'cancelada', label: 'Canceladas' },
    { value: 'reprogramada', label: 'Reprogramadas' },
    { value: 'completada', label: 'Completadas' },
  ];

  readonly modalidades: Array<{ value: ModalidadFiltro; label: string }> = [
    { value: 'todas', label: 'Todas' },
    { value: 'presencial', label: 'Presencial' },
    { value: 'telemedicina', label: 'Telemedicina' },
  ];

  ngOnInit() {
    this.cargarAgenda(); // Primera carga en cuanto Angular pinta el componente.
  }

  /**
   * Genera el texto que describe el rango de tiempo seleccionado, ajustándose a la "vistaActiva".
   * Si es semana, calcula desde lunes hasta domingo de esa semana.
   */
  get periodoTitulo(): string {
    const fecha = this.parseISODate(this.fechaSeleccionada);

    if (this.vistaActiva === 'dia') {
      return formatFechaLargaConDia(this.fechaSeleccionada); // ej: "lunes, 1 de may 2026"
    }

    if (this.vistaActiva === 'mes') {
      return formatMesAnio(fecha); // ej: "Mayo 2026"
    }

    // Calcula el rango de la semana del día seleccionado, del Lunes al Domingo
    const inicio = this.inicioSemana(fecha);
    const fin = this.sumarDias(inicio, 6);
    return `${formatFechaCorta(this.toISODate(inicio))} - ${formatFechaDiaMesAnio(this.toISODate(fin))}`;
  }

  /**
   * Genera un arreglo de 7 objetos `DiaAgenda` partiendo invariablemente del lunes 
   * de la semana que contiene a la fecha que el médico está revisando (`fechaSeleccionada`).
   * Estos días construyen la "tira" semanal del calendario.
   */
  get diasDelPeriodo(): DiaAgenda[] {
    const inicio = this.inicioSemana(this.parseISODate(this.fechaSeleccionada));

    return Array.from({ length: 7 }, (_, index) => {
      const fecha = this.sumarDias(inicio, index); // index aumenta de 0 a 6
      const fechaISO = this.toISODate(fecha); // Lo pasamos a formato plano de BBDD "YYYY-MM-DD"

      return {
        fecha: fechaISO,
        etiquetaDia: fecha.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''), // Devuelve LUN, MAR
        numeroDia: fecha.toLocaleDateString('es-CL', { day: '2-digit' }), // Devuelve 01, 15, 23
        esHoy: fechaISO === this.toISODate(new Date()), // Compara estrictamente con la fecha local de hoy
        esSeleccionado: fechaISO === this.fechaSeleccionada, // Pinta el día que está "tocado"
        // Bug fix #2: Cuenta las citas reales de ese día para mostrar el dot/badge en el calendario.
        // Antes siempre devolvía 0, por eso no aparecía nada arriba en el strip.
        cantidadCitas: this.citasAgenda.filter(c => this.fechaCita(c) === fechaISO).length,
        cantidadSlots: 0,
      };
    });
  }

  /**
   * Una la data del GET (citas pendientes hoy vs citas futuras) en un único mapa local.
   * Al ingresarlas con ID a un Map, elimina posibles duplicados, y a la salida las ordena.
   */
  get citasAgenda(): CitaMedico[] {
    const mapa = new Map<number, CitaMedico>();
    [...this.citasHoy, ...this.citasProximas].forEach((cita) => mapa.set(cita.id_cita, cita));
    return [...mapa.values()].sort((a, b) =>
      `${this.fechaCita(a)} ${a.hora_cita}`.localeCompare(`${this.fechaCita(b)} ${b.hora_cita}`)
    );
  }

  /**
   * Realiza el filtrado cliente side por cada pulsación de tecla o cada click a un <select>.
   * Es una getter porque la vista itera esto: '*ngFor="let cita of citasFiltradas"'.
   * Se evalúan fecha seleccionada, texto, estado, y modalidad. Todos deben pasar para que la cita se pinte.
   */
  get citasFiltradas(): CitaMedico[] {
    const busqueda = this.terminoBusqueda.trim().toLowerCase();

    return this.citasAgenda.filter((cita) => {
      // Bug fix #1: Solo muestra citas del día que está seleccionado en el calendario.
      // Sin esto, la lista ignoraba completamente qué día estaba clicado.
      const coincideFecha = this.fechaCita(cita) === this.fechaSeleccionada;

      // Formamos el string por si buscaron combinando nombre y apellido
      const nombrePaciente = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();

      const coincideTexto = !busqueda
        || nombrePaciente.includes(busqueda)
        || cita.nombre_especialidad.toLowerCase().includes(busqueda)
        || cita.motivo_consulta.toLowerCase().includes(busqueda);

      const coincideEstado = this.filtroEstado === 'todos'
        || this.normalizarEstado(cita.estado_cita) === this.filtroEstado;

      const coincideModalidad = this.filtroModalidad === 'todas'
        || cita.modalidad === this.filtroModalidad;

      return coincideFecha && coincideTexto && coincideEstado && coincideModalidad;
    });
  }

  // Permite permutar entre vistas desde tabs en la cabecera del calendario.
  cambiarVista(vista: VistaAgenda): void {
    this.vistaActiva = vista;
  }

  // Abre y cierra el panel de gestión de horario con cada pulsación del botón "Gestionar mi horario".
  togglePanelHorario(): void {
    this.panelHorarioAbierto = !this.panelHorarioAbierto;
    this.feedbackMessage = '';
  }

  // ── B3: métodos del bento grid de horario ────────────────────────────────────

  /** Activa o desactiva un día del selector de días laborales. */
  toggleDia(dia: number): void {
    this.diasActivos = this.diasActivos.includes(dia)
      ? this.diasActivos.filter((d) => d !== dia)
      : [...this.diasActivos, dia];
  }

  /** Indica si un día dado está en la lista de días activos. */
  diaActivo(dia: number): boolean {
    return this.diasActivos.includes(dia);
  }

  /** Agrega una nueva fila vacía al editor de bloques horarios. */
  agregarBloqueForm(): void {
    this.bloquesForm = [...this.bloquesForm, { horaInicio: '09:00', horaFin: '10:00' }];
  }

  /** Elimina la fila del editor de bloques (no elimina bloques ya guardados). */
  eliminarBloqueForm(index: number): void {
    this.bloquesForm = this.bloquesForm.filter((_, i) => i !== index);
  }

  /**
   * Genera bloques de disponibilidad localmente a partir de las filas del editor,
   * los días activos y la cantidad de semanas a repetir.
   * No llama al backend todavía (pendiente subbloque E1).
   */
  guardarDisponibilidad(): void {
    if (!this.bloquesFormValidos()) {
      this.feedbackMessage = 'Revisa los rangos: la hora fin debe ser posterior a la hora inicio en cada bloque.';
      return;
    }

    const fechas = this.fechasParaCrear();
    const nuevosSlots: BloqueDisponibilidad[] = [];

    fechas.forEach((fecha) => {
      this.bloquesForm.forEach((bloque, index) => {
        if (!this.existeBloque(fecha, bloque.horaInicio, bloque.horaFin)) {
          nuevosSlots.push({
            id_disponibilidad: Date.now() + index,
            fecha,
            hora_inicio: bloque.horaInicio,
            hora_fin: bloque.horaFin,
            estado: 'disponible',
            modalidad: 'presencial',
          });
        }
      });
    });

    this.disponibilidad = [...this.disponibilidad, ...nuevosSlots];
    this.feedbackMessage = nuevosSlots.length > 0
      ? `${nuevosSlots.length} bloque(s) creados. Falta conectarlos al endpoint POST.`
      : 'No se crearon bloques: ya existían en esos rangos.';
  }

  // ── Helpers privados de disponibilidad ──────────────────────────────────────

  /** Verifica que en cada fila la hora fin sea posterior a la hora inicio. */
  private bloquesFormValidos(): boolean {
    return this.bloquesForm.every(
      (b) => this.minutos(b.horaFin) > this.minutos(b.horaInicio)
    );
  }

  /** Convierte "HH:MM" a minutos totales para comparar rangos horarios. */
  private minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  /** Comprueba si ya existe un bloque con la misma fecha y rango horario. */
  private existeBloque(fecha: string, horaInicio: string, horaFin: string): boolean {
    return this.disponibilidad.some(
      (slot) => slot.fecha === fecha && slot.hora_inicio === horaInicio && slot.hora_fin === horaFin
    );
  }

  /**
   * Genera el arreglo de fechas ISO en las que se crearán bloques,
   * combinando los días activos con las semanas a repetir.
   * Usa toISODate() y no toISOString() para evitar UTC shift (ver Subbloque D).
   */
  private fechasParaCrear(): string[] {
    const inicio = this.inicioSemana(this.parseISODate(this.fechaSeleccionada));
    const semanas = Math.max(1, Number(this.repetirSemanas) || 1);
    const dias = this.diasActivos.length > 0
      ? this.diasActivos
      : [this.parseISODate(this.fechaSeleccionada).getDay()];
    const fechas: string[] = [];

    for (let semana = 0; semana < semanas; semana += 1) {
      dias.forEach((dia) => {
        const base = this.sumarDias(inicio, semana * 7);
        fechas.push(this.toISODate(this.sumarDias(base, dia === 0 ? 6 : dia - 1)));
      });
    }

    return [...new Set(fechas)].sort();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  // Adelanta o retrocede usando +1 y -1 de salto, dependiendo si veo semanas o meses.
  moverPeriodo(direccion: -1 | 1): void {
    const fecha = this.parseISODate(this.fechaSeleccionada);
    // Si navego meses: +-30 días. Si semanas: +-7 días. Días +-1
    const salto = this.vistaActiva === 'mes' ? 30 : this.vistaActiva === 'semana' ? 7 : 1;
    this.fechaSeleccionada = this.toISODate(this.sumarDias(fecha, salto * direccion));
  }

  // Vuelve el strip de calendario a la fecha actual del sistema.
  irAHoy(): void {
    this.fechaSeleccionada = this.toISODate(new Date());
  }

  // Acumula el día clikado en el panel como pivote y fuerza al componente a re-calcular "diasDelPeriodo" con el nuevo pivote
  seleccionarDia(fecha: string): void {
    this.fechaSeleccionada = fecha;
  }

  /**
   * Dispara llamadas HTTP para citas pendientes, en cuanto terminan pide 
   * a sí misma cargar "citasProximas". Apaga la barra loading cuando ambas han acabado.
   */
  cargarAgenda() {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicoService.getCitasParaMarcar().subscribe({
      next: (data: CitasMedicoData) => {
        this.citasHoy = data.citas ?? [];
        this.cargarCitasProximas(); // La llamada dependiente
      },
      error: () => {
        this.citasHoy = [];
        this.isLoading = false;
        this.errorMessage = 'No fue posible cargar la agenda médica.';
      }
    }); // Las promesas Rx rxjs .subscribe actualizan la pantalla tan pronto terminan del pool
  }

  // Extrae y encola la información de citas del servicio `getCitasProximas` 
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
    }); // La view apaga su loading con `isLoading = false` y dibuja todo de golpe.
  }

  // Clickear el botón de sincronización de agenda hace reload manual.
  refrescarAgenda() {
    this.cargarAgenda();
  }

  // Abre la página dedicada a la ficha de un paciente específico desde un ID
  verFichaPaciente(idPaciente?: number) {
    if (!idPaciente) {
      return;
    }

    this.router.navigate(['/medico/pacientes', idPaciente, 'ficha']);
  }

  /**
   * Sanitiza el estado que llega de backend, por si el desarrollador puso Uppercase o estados
   * inesperados que no encajan en el filtro controlado. Fuerza cualquier valor corrupto a "pendiente".
   */
  normalizarEstado(estado: string): EstadoFiltro {
    const valor = estado.toLowerCase() as EstadoFiltro;
    return ['pendiente', 'confirmada', 'cancelada', 'reprogramada', 'completada'].includes(valor)
      ? valor
      : 'pendiente';
  }

  // Retorna solo la parte año-mes-día en bruto, sin colas de TimeZone. EJ: 2026-05-01.
  fechaCita(cita: CitaMedico): string {
    return cita.fecha_cita.split('T')[0];
  }

  // helper UTC local. Descubre qué fecha fue "este lunes", partiendo desde `fecha`.
  private inicioSemana(fecha: Date): Date {
    const copia = new Date(fecha);
    const dia = copia.getDay();
    // En JS los domingos son 0. Si es domingo (0) nos forzamos retroceder 6 para llegar a Lunes
    const distanciaAlLunes = dia === 0 ? -6 : 1 - dia;
    return this.sumarDias(copia, distanciaAlLunes);
  }

  // helper general. Avanza y retrocede n días la fecha pivote clonada.
  private sumarDias(fecha: Date, dias: number): Date {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  // Utilida crítica en toda agenda: Nunca parses a "new Date('string')" por bugs UTC-3 ni con toISOString. 
  // Crea el new date con "T00:00:00" pegado impidiendo timezone shifts de los navegadores.
  private parseISODate(fechaISO: string): Date {
    return new Date(`${fechaISO.split('T')[0]}T00:00:00`);
  }

  // Convierte string date a string nativo YYYY-MM-DD "limpio" agregando cero del padding si es 05 o 01.
  private toISODate(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}




