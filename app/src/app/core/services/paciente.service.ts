import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProximaCita {
  id_cita:            number;
  fecha_cita:         string;
  hora_cita:          string;
  estado_cita:        string;
  motivo_consulta:    string;
  modalidad:          string;
  medico_nombre:      string;
  medico_apellido:    string;
  nombre_especialidad: string;
}

export interface Notificacion {
  id_notificacion: number;
  titulo:          string;
  mensaje:         string;
  tipo:            string;
  leida:           boolean;
  fecha_envio:     string;
}

export interface DashboardData {
  proximaCita:    ProximaCita | null;
  notificaciones: Notificacion[];
  noLeidas:       number;
}

export interface Especialidad {
  id_especialidad:     number;
  nombre_especialidad: string;
  descripcion:         string;
}

export interface EspecialidadesData {
  especialidades: Especialidad[];
  noLeidas:       number;
}

export interface DisponibilidadSlot {
  id_disponibilidad: number;
  id_medico:         number;
  fecha:             string;
  hora_inicio:       string;
  hora_fin:          string;
}

export interface MedicoProfesional {
  id_medico:         number;
  nombre:            string;
  apellido:          string;
  anios_experiencia: number;
  numero_registro:   string;
  disponibilidad:    DisponibilidadSlot[];
}

export interface ProfesionalesData {
  especialidad: Especialidad;
  medicos:      MedicoProfesional[];
  noLeidas:     number;
}

export interface HorarioAtencion {
  dia_semana:  number;
  hora_inicio: string;
  hora_fin:    string;
}

export interface DetalleMedicoData {
  medico: {
    id_medico:                number;
    nombre:                   string;
    apellido:                 string;
    anios_experiencia:        number;
    numero_registro:          string;
    biografia:                string | null;
    valoracion_promedio:      string;
    total_valoraciones:       number;
    id_especialidad:          number;
    nombre_especialidad:      string;
    descripcion_especialidad: string;
  };
  horarioAtencion: HorarioAtencion[];
  proximoSlot:     { fecha: string; hora_inicio: string; hora_fin: string } | null;
  totalConsultas:  number;
  noLeidas:        number;
}

export interface DisponibilidadMedicoData {
  medico: {
    id_medico:            number;
    nombre:               string;
    apellido:             string;
    id_especialidad:      number;
    nombre_especialidad:  string;
  };
  disponibilidad: DisponibilidadSlot[];
  noLeidas:       number;
}

export interface CrearCitaPayload {
  id_medico:          number;
  id_especialidad:    number;
  id_disponibilidad:  number;
  modalidad:          'presencial' | 'telemedicina';
  motivo_consulta:    string;
}

export interface CrearCitaResponse {
  message: string;
  id_cita: number;
}

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/paciente`;

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.API}/dashboard`);
  }

  getEspecialidades(): Observable<EspecialidadesData> {
    return this.http.get<EspecialidadesData>(`${this.API}/especialidades`);
  }

  getProfesionales(idEspecialidad: number): Observable<ProfesionalesData> {
    return this.http.get<ProfesionalesData>(`${this.API}/profesionales/${idEspecialidad}`);
  }

  getDetalleMedico(idMedico: number): Observable<DetalleMedicoData> {
    return this.http.get<DetalleMedicoData>(`${this.API}/medico/${idMedico}`);
  }

  getDisponibilidadMedico(idMedico: number): Observable<DisponibilidadMedicoData> {
    return this.http.get<DisponibilidadMedicoData>(`${this.API}/medico/${idMedico}/disponibilidad`);
  }

  crearCita(payload: CrearCitaPayload): Observable<CrearCitaResponse> {
    return this.http.post<CrearCitaResponse>(`${this.API}/reservar`, payload);
  }
}
