import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CitaMedico {
  id_cita:                number;
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

@Injectable({ providedIn: 'root' })
export class MedicoService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/medico`;

  getDashboard(): Observable<DashboardMedicoData> {
    return this.http.get<DashboardMedicoData>(`${this.API}/dashboard`);
  }

  getCitasParaMarcar(): Observable<CitasMedicoData> {
    return this.http.get<CitasMedicoData>(`${this.API}/citas-hoy`);
  }

  getCitasProximas(): Observable<CitasMedicoData> {
    return this.http.get<CitasMedicoData>(`${this.API}/citas-proximas`);
  }

  marcarAsistencia(idCita: number, asistio: boolean): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.API}/cita/${idCita}/marcar-asistencia`,
      { asistio }
    );
  }
}
