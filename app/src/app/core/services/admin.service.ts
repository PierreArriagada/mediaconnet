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
}

