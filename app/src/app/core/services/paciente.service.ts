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
}
