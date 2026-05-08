import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';


// Edu: estructura tipada real para la ficha clínica del paciente en el módulo médico.
export interface FichaPacienteData {
  // Edu: datos personales devueltos por el backend desde pacientes + usuarios.
  paciente: {
    id_paciente: number;
    rut: string;
    nombre: string;
    apellido: string;
    correo: string;
    telefono: string;
    estado: string;
  };
  // Edu: historial clínico registrado previamente para este paciente.
  historial: Array<{
    id_historial: number;
    id_cita: number;
    diagnostico: string | null;
    tratamiento: string | null;
    observaciones: string | null;
    fecha_registro: string;
    fecha_cita: string;
    hora_cita: string;
    modalidad: string;
    motivo_consulta: string;
    estado_cita: string;
    asistio_cita: boolean | null;
    nombre_especialidad: string;
  }>;
  // Edu: citas asociadas al paciente con el médico autenticado.
  citas: Array<{
    id_cita: number;
    fecha_cita: string;
    hora_cita: string;
    estado_cita: string;
    modalidad: string;
    motivo_consulta: string;
    confirmada_asistencia: boolean | null;
    asistio_cita: boolean | null;
    nombre_especialidad: string;
  }>;
}

// Edu: estructura tipada para listado de pacientes del profesional autenticado.
export interface PacienteMedico {
  id_paciente: number;
  rut: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  estado: string;
  ultima_cita: string | null;
}

export interface PacientesMedicoData {
  pacientes: PacienteMedico[];
}

export interface CitaMedico {
  id_cita:                number;
  id_paciente:            number;
  fecha_cita:             string;
  hora_cita:              string;
  estado_cita:            string;
  modalidad:              string;
  motivo_consulta:        string;
  confirmada_asistencia:  boolean | null;
  asistio_cita:           boolean | null;
  paciente_nombre:        string;
  paciente_apellido:      string;
  nombre_especialidad:    string;
}

export interface CitasMedicoData {
  citas:    CitaMedico[];
  noLeidas: number;
}

export interface HistorialAtencionMedico {
  id_historial:    number;
  id_cita:         number;
  diagnostico:     string | null;
  tratamiento:     string | null;
  observaciones:   string | null;
  fecha_registro:  string;
}

export interface DetalleCitaMedicoData {
  cita: {
    id_cita:                  number;
    id_paciente:              number;
    id_especialidad:          number;
    id_disponibilidad:        number | null;
    fecha_cita:               string;
    hora_cita:                string;
    estado_cita:              string;
    modalidad:                string;
    motivo_consulta:          string;
    observaciones_cita:       string | null;
    es_invitado:              boolean;
    confirmada_asistencia:    boolean | null;
    asistio_cita:             boolean | null;
    paciente_rut:             string;
    paciente_nombre:          string;
    paciente_apellido:        string;
    paciente_correo:          string;
    paciente_telefono:        string;
    nombre_especialidad:      string;
    cita_ocurrida:            boolean;
  };
  historial: HistorialAtencionMedico | null;
  puedeRegistrarHistorial: boolean;
  noLeidas: number;
}

export interface GuardarHistorialCitaPayload {
  diagnostico?:   string | null;
  tratamiento?:   string | null;
  observaciones?: string | null;
}

export interface DashboardMedicoData {
  citasHoy:          CitaMedico[];
  pendientesMarcar:  number;
  proximaCita:       {
    id_cita:              number;
    fecha_cita:           string;
    hora_cita:            string;
    modalidad:            string;
    paciente_nombre:      string;
    paciente_apellido:    string;
    nombre_especialidad:  string;
  } | null;
  noLeidas:          number;
}

export interface MensajeResponse {
  message: string;
}

export interface PerfilMedicoData {
  id_medico:           number;
  nombre:              string;
  apellido:            string;
  correo:              string;
  telefono:            string | null;
  estado:              string;
  foto_perfil_url:     string | null;
  numero_registro:     string;
  anios_experiencia:   number;
  nombre_especialidad: string;
}

export interface ActualizarPerfilMedicoPayload {
  nombre:    string;
  apellido:  string;
  correo:    string;
  telefono?: string | null;
}

export interface CambiarPasswordPayload {
  contrasena_actual: string;
  contrasena_nueva:  string;
}

export interface FotoPerfilMedicoResponse {
  message: string;
  foto_perfil_url: string;
}

export interface NotificacionMedico {
  id_notificacion: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  fecha_envio: string;
}

export interface NotificacionesMedicoData {
  notificaciones: NotificacionMedico[];
  noLeidas: number;
  total: number;
  limit: number;
  offset: number;
}

export interface NotificacionesQueryParams {
  limit?: number;
  offset?: number;
}

export interface DisponibilidadBloque {
  id_disponibilidad: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'disponible' | 'reservada' | 'bloqueada';
  nota?: string;
}

@Injectable({ providedIn: 'root' })
export class MedicoService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/medico`;

  getDashboard(): Observable<DashboardMedicoData> {
    return this.http.get<DashboardMedicoData>(`${this.API}/dashboard`);
  }

  getPerfil(): Observable<PerfilMedicoData> {
    return this.http
      .get<{ perfil: PerfilMedicoData }>(`${this.API}/perfil`)
      .pipe(map((r) => r.perfil));
  }

  actualizarPerfil(payload: ActualizarPerfilMedicoPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/perfil`, payload);
  }

  subirFotoPerfil(archivo: File): Observable<FotoPerfilMedicoResponse> {
    const formData = new FormData();
    formData.append('fotoPerfil', archivo);

    return this.http.post<FotoPerfilMedicoResponse>(`${this.API}/perfil/foto`, formData);
  }

  cambiarPassword(payload: CambiarPasswordPayload): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.API}/perfil/password`, payload);
  }

  getCitasParaMarcar(): Observable<CitasMedicoData> {
    return this.http.get<CitasMedicoData>(`${this.API}/citas-hoy`);
  }

  getCitasProximas(): Observable<CitasMedicoData> {
    return this.http.get<CitasMedicoData>(`${this.API}/citas-proximas`);
  }

  getDetalleCita(idCita: number): Observable<DetalleCitaMedicoData> {
    return this.http.get<DetalleCitaMedicoData>(`${this.API}/cita/${idCita}`);
  }

  guardarHistorialCita(
    idCita: number,
    payload: GuardarHistorialCitaPayload
  ): Observable<{ message: string; historial: HistorialAtencionMedico }> {
    return this.http.put<{ message: string; historial: HistorialAtencionMedico }>(
      `${this.API}/cita/${idCita}/historial`,
      payload
    );
  }

  // Edu: obtiene ficha clínica básica del paciente para futuras vistas médicas.
  getFichaPaciente(idPaciente: number): Observable<FichaPacienteData> {
    return this.http.get<FichaPacienteData>(`${this.API}/paciente/${idPaciente}/ficha`);
  }

  // Edu: obtiene pacientes únicos asociados al médico autenticado.
  getPacientes(): Observable<PacientesMedicoData> {
    return this.http.get<PacientesMedicoData>(`${this.API}/pacientes`);
  }

  marcarAsistencia(idCita: number, asistio: boolean): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.API}/cita/${idCita}/marcar-asistencia`,
      { asistio }
    );
  }

  getDisponibilidad(desde: string, hasta: string): Observable<DisponibilidadBloque[]> {
    return this.http.get<DisponibilidadBloque[]>(
      `${this.API}/disponibilidad?desde=${desde}&hasta=${hasta}`
    );
  }

  crearDisponibilidad(bloques: Partial<DisponibilidadBloque>[]): Observable<DisponibilidadBloque[]> {
    return this.http.post<DisponibilidadBloque[]>(`${this.API}/disponibilidad`, { bloques });
  }

  actualizarDisponibilidad(id: number, cambios: Partial<DisponibilidadBloque>): Observable<DisponibilidadBloque> {
    return this.http.patch<DisponibilidadBloque>(`${this.API}/disponibilidad/${id}`, cambios);
  }

  eliminarDisponibilidad(id: number): Observable<MensajeResponse> {
    return this.http.delete<MensajeResponse>(`${this.API}/disponibilidad/${id}`);
  }

  getNotificaciones(filtros?: NotificacionesQueryParams): Observable<NotificacionesMedicoData> {
    let params = new HttpParams();
    if (typeof filtros?.limit === 'number') params = params.set('limit', filtros.limit);
    if (typeof filtros?.offset === 'number') params = params.set('offset', filtros.offset);

    return this.http.get<NotificacionesMedicoData>(`${this.API}/notificaciones`, { params });
  }

  marcarNotificacionesLeidas(): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.API}/notificaciones/marcar-leidas`, {});
  }

  // Edu: marca una notificación como leída o no leída.
  actualizarEstadoNotificacion(idNotificacion: number, leida: boolean): Observable<{ notificacion: NotificacionMedico }> {
    return this.http.patch<{ notificacion: NotificacionMedico }>(
      `${this.API}/notificaciones/${idNotificacion}/leida`,
      { leida }
    );
  }

  limpiarNotificaciones(): Observable<MensajeResponse> {
    return this.http.delete<MensajeResponse>(`${this.API}/notificaciones`);
  }

  // Edu: elimina una notificación del médico autenticado.
  eliminarNotificacion(idNotificacion: number): Observable<MensajeResponse> {
    return this.http.delete<MensajeResponse>(`${this.API}/notificaciones/${idNotificacion}`);
  }
}
