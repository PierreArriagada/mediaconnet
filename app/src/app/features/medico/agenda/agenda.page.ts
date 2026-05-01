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




