import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── Disponibilidad ───────────────────────────────────────────────────────────

export interface MedicoListItem {
  id_medico: number;
  nombre: string;
  apellido: string;
  especialidad: string;
  estado: string;
}

export interface DisponibilidadAdminBloque {
  id_disponibilidad: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'disponible' | 'reservada' | 'bloqueada';
  nota?: string;
}

// ── Gestión de médicos ───────────────────────────────────────────────────────

export type EstadoLaboral =
  | 'activo'
  | 'vacaciones'
  | 'licencia_medica'
  | 'licencia_administrativa'
  | 'inactivo'
  | 'destituido';

export interface MedicoGestionItem {
  id_medico: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  estado_sistema: string;
  especialidad: string;
  id_especialidad: number;
  numero_registro: string;
  anios_experiencia: number;
  estado_medico: string;
  estado_laboral: EstadoLaboral;
  valoracion_promedio: number;
  total_valoraciones: number;
  fecha_creacion: string;
  total_citas: number;
  citas_futuras: number;
}

export interface MedicoDetalle {
  id_medico: number;
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  estado_sistema: string;
  fecha_registro: string;
  id_especialidad: number;
  especialidad: string;
  numero_registro: string;
  anios_experiencia: number;
  biografia: string | null;
  valoracion_promedio: number;
  total_valoraciones: number;
  estado_medico: string;
  estado_laboral: EstadoLaboral;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CitaHistorialItem {
  id_cita: number;
  fecha_cita: string;
  hora_cita: string;
  estado: string;
  modalidad: string;
  motivo_consulta: string | null;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
}

export interface MedicoDetalleResponse {
  medico: MedicoDetalle;
  historial_citas: CitaHistorialItem[];
}

export interface EspecialidadItem {
  id_especialidad: number;
  nombre_especialidad: string;
  estado: string;
}

// ── Pacientes ────────────────────────────────────────────────────────────────

export interface PacienteListItem {
  id_paciente: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  estado_cuenta: string;
  rut: string;
  fecha_nacimiento: string;
  ciudad: string | null;
  comuna: string | null;
  fecha_registro: string;
  total_citas: number;
  ultima_cita: string | null;
  proxima_cita: string | null;
}

export interface PacienteDetalle {
  id_paciente: number;
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  estado_cuenta: string;
  fecha_registro: string;
  rut: string;
  fecha_nacimiento: string;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CitaPacienteItem {
  id_cita: number;
  fecha_cita: string;
  hora_cita: string;
  estado: string;
  modalidad: string;
  motivo_consulta: string | null;
  observaciones: string | null;
  es_invitado: boolean;
  confirmada_asistencia: boolean | null;
  asistio_cita: boolean | null;
  especialidad: string;
  medico_nombre: string;
  medico_apellido: string;
  id_medico: number;
  tiene_historial: boolean;
}

export interface PacienteDetalleResponse {
  paciente: PacienteDetalle;
  citas: CitaPacienteItem[];
}

export interface CitaAdminDetalle {
  id_cita: number;
  fecha_cita: string;
  hora_cita: string;
  estado: string;
  modalidad: string;
  motivo_consulta: string | null;
  observaciones: string | null;
  es_invitado: boolean;
  confirmada_asistencia: boolean | null;
  asistio_cita: boolean | null;
  nombre_invitado: string | null;
  apellido_invitado: string | null;
  correo_invitado: string | null;
  telefono_invitado: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  // Paciente
  id_paciente: number;
  paciente_nombre: string;
  paciente_apellido: string;
  paciente_correo: string;
  paciente_telefono: string | null;
  paciente_rut: string;
  // Médico
  id_medico: number;
  medico_nombre: string;
  medico_apellido: string;
  medico_correo: string;
  medico_telefono: string | null;
  medico_registro: string;
  medico_experiencia: number;
  // Especialidad
  id_especialidad: number;
  especialidad: string;
}

export interface HistorialAtencion {
  id_historial: number;
  diagnostico: string | null;
  tratamiento: string | null;
  notas_historial: string | null;
  fecha_registro: string;
}

export interface CitaAdminDetalleResponse {
  cita: CitaAdminDetalle;
  historial: HistorialAtencion | null;
}

export interface FiltrosPacientes {
  q?: string;
  estado?: string;
}

export interface NuevoMedicoPayload {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  password_inicial: string;
  id_especialidad: number;
  numero_registro: string;
  anios_experiencia?: number;
  biografia?: string;
}

export interface EditarPerfilPayload {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  id_especialidad: number;
  numero_registro: string;
  anios_experiencia?: number;
  biografia?: string;
}

export interface FiltrosMedicosGestion {
  q?: string;
  especialidad?: string;
  estado_laboral?: EstadoLaboral;
}

<<<<<<< Updated upstream
// ── Notificaciones ──────────────────────────────────────────────────────────

export interface NotificacionAdmin {
=======
// ── Solicitudes de invitado ──────────────────────────────────────────────────

export interface SolicitudAdminItem {
  id_cita: number;
  nombre_invitado: string;
  apellido_invitado: string;
  correo_invitado: string;
  telefono_invitado: string;
  motivo_consulta: string;
  fecha_creacion: string;
  fecha_limite_asignacion: string;
  tiempo_restante_seg: number;
  fecha_cita: string;
  hora_cita: string;
  id_disponibilidad: number;
  especialidad: string;
  medico_nombre: string;
  medico_apellido: string;
  id_medico: number;
}

export interface SlotAlternativa {
  id_disponibilidad: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface MedicoAlternativa {
  id_medico: number;
  nombre: string;
  apellido: string;
  anios_experiencia: number;
  slots: SlotAlternativa[];
}

// ── Notificaciones del administrador ────────────────────────────────────────

export interface AdminNotificacion {
>>>>>>> Stashed changes
  id_notificacion: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  fecha_envio: string;
}

<<<<<<< Updated upstream
export interface NotificacionesAdminResponse {
  notificaciones: NotificacionAdmin[];
=======
export interface AdminNotificacionesResponse {
  notificaciones: AdminNotificacion[];
  noLeidas: number;
>>>>>>> Stashed changes
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/admin`;

  // ── Disponibilidad (uso desde Horarios) ────────────────────────────────────

  getMedicos(): Observable<MedicoListItem[]> {
    return this.http
      .get<{ medicos: MedicoListItem[] }>(`${this.API}/medicos`)
      .pipe(map((r) => r.medicos));
  }

  getDisponibilidad(idMedico: number, desde: string, hasta: string): Observable<DisponibilidadAdminBloque[]> {
    return this.http.get<DisponibilidadAdminBloque[]>(
      `${this.API}/medicos/${idMedico}/disponibilidad?desde=${desde}&hasta=${hasta}`,
    );
  }

  crearDisponibilidad(
    idMedico: number,
    bloques: Partial<DisponibilidadAdminBloque>[],
  ): Observable<DisponibilidadAdminBloque[]> {
    return this.http.post<DisponibilidadAdminBloque[]>(
      `${this.API}/medicos/${idMedico}/disponibilidad`,
      { bloques },
    );
  }

  actualizarDisponibilidad(
    id: number,
    cambios: Pick<DisponibilidadAdminBloque, 'fecha' | 'hora_inicio' | 'hora_fin' | 'estado'>,
  ): Observable<DisponibilidadAdminBloque> {
    return this.http.patch<DisponibilidadAdminBloque>(
      `${this.API}/disponibilidad/${id}`,
      cambios,
    );
  }

  eliminarDisponibilidad(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API}/disponibilidad/${id}`,
    );
  }

  // ── Gestión de médicos ─────────────────────────────────────────────────────

  getMedicosGestion(filtros?: FiltrosMedicosGestion): Observable<MedicoGestionItem[]> {
    let params = new HttpParams();
    if (filtros?.q)             params = params.set('q', filtros.q);
    if (filtros?.especialidad)  params = params.set('especialidad', filtros.especialidad);
    if (filtros?.estado_laboral) params = params.set('estado_laboral', filtros.estado_laboral);

    return this.http
      .get<{ medicos: MedicoGestionItem[] }>(`${this.API}/medicos/gestion`, { params })
      .pipe(map((r) => r.medicos));
  }

  getMedicoDetalle(id: number): Observable<MedicoDetalleResponse> {
    return this.http.get<MedicoDetalleResponse>(`${this.API}/medicos/${id}/detalle`);
  }

  crearMedico(payload: NuevoMedicoPayload): Observable<{ message: string; id_medico: number }> {
    return this.http.post<{ message: string; id_medico: number }>(
      `${this.API}/medicos`,
      payload,
    );
  }

  editarPerfil(id: number, payload: EditarPerfilPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API}/medicos/${id}/perfil`, payload);
  }

  cambiarEstadoLaboral(
    id: number,
    nuevo_estado: EstadoLaboral,
    motivo?: string,
  ): Observable<{ message: string; nuevo_estado: EstadoLaboral }> {
    return this.http.patch<{ message: string; nuevo_estado: EstadoLaboral }>(
      `${this.API}/medicos/${id}/estado-laboral`,
      { nuevo_estado, motivo },
    );
  }

  getEspecialidades(): Observable<EspecialidadItem[]> {
    return this.http
      .get<{ especialidades: EspecialidadItem[] }>(`${this.API}/especialidades`)
      .pipe(map((r) => r.especialidades));
  }

  // ── Pacientes ──────────────────────────────────────────────────────────────

  getPacientes(filtros?: FiltrosPacientes): Observable<PacienteListItem[]> {
    let params = new HttpParams();
    if (filtros?.q)      params = params.set('q', filtros.q);
    if (filtros?.estado) params = params.set('estado', filtros.estado);

    return this.http
      .get<{ pacientes: PacienteListItem[] }>(`${this.API}/pacientes`, { params })
      .pipe(map((r) => r.pacientes));
  }

  getPacienteDetalle(id: number): Observable<PacienteDetalleResponse> {
    return this.http.get<PacienteDetalleResponse>(`${this.API}/pacientes/${id}`);
  }

  getCitaDetalle(id: number): Observable<CitaAdminDetalleResponse> {
    return this.http.get<CitaAdminDetalleResponse>(`${this.API}/citas/${id}`);
  }
<<<<<<< Updated upstream
=======

  // ── Solicitudes de invitado ────────────────────────────────────────────────

  getSolicitudes(): Observable<SolicitudAdminItem[]> {
    return this.http
      .get<{ solicitudes: SolicitudAdminItem[] }>(`${this.API}/solicitudes`)
      .pipe(map((r) => r.solicitudes));
  }

  getSolicitudAlternativas(idCita: number): Observable<MedicoAlternativa[]> {
    return this.http
      .get<{ medicos: MedicoAlternativa[] }>(`${this.API}/solicitudes/${idCita}/alternativas`)
      .pipe(map((r) => r.medicos));
  }

  confirmarSolicitud(idCita: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.API}/solicitudes/${idCita}/confirmar`,
      {}
    );
  }

  reasignarSolicitud(idCita: number, idDisponibilidad: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.API}/solicitudes/${idCita}/reasignar`,
      { id_disponibilidad: idDisponibilidad }
    );
  }

  // ── Notificaciones del administrador ──────────────────────────────────────

  getNotificacionesAdmin(): Observable<AdminNotificacionesResponse> {
    return this.http.get<AdminNotificacionesResponse>(`${this.API}/notificaciones`);
  }

  marcarNotificacionesLeidasAdmin(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.API}/notificaciones/marcar-leidas`, {});
  }
}
>>>>>>> Stashed changes

  // ── Notificaciones ────────────────────────────────────────────────────────

  getNotificaciones(): Observable<NotificacionesAdminResponse> {
    return this.http.get<NotificacionesAdminResponse>(`${this.API}/notificaciones`);
  }

  // Edu: marca una notificación admin como leída o no leída.
  actualizarEstadoNotificacion(idNotificacion: number, leida: boolean): Observable<{ notificacion: NotificacionAdmin }> {
    return this.http.patch<{ notificacion: NotificacionAdmin }>(
      `${this.API}/notificaciones/${idNotificacion}/leida`,
      { leida },
    );
  }

  // Edu: elimina una notificación admin del usuario autenticado.
  eliminarNotificacion(idNotificacion: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/notificaciones/${idNotificacion}`);
  }
}
