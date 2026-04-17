import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Especialidad {
  id_especialidad:    number;
  nombre_especialidad: string;
  descripcion:        string;
}

export interface SolicitudCitaInvitado {
  nombre:            string;
  apellido:          string;
  rut:               string;
  telefono:          string;
  correo:            string;
  fecha_nacimiento:  string;
  id_especialidad:   number;
  motivo_consulta:   string;
  fecha_preferente:  string;
  franja_horaria:    'manana' | 'tarde';
}

export interface RespuestaCitaInvitado {
  message: string;
  id_cita: number;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/citas`;

  getEspecialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${this.API}/especialidades`);
  }

  crearCitaInvitado(data: SolicitudCitaInvitado): Observable<RespuestaCitaInvitado> {
    return this.http.post<RespuestaCitaInvitado>(`${this.API}/invitado`, data);
  }
}
