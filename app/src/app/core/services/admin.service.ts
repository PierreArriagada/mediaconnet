import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly API  = `${environment.apiUrl}/admin`;

  getMedicos(): Observable<MedicoListItem[]> {
    return this.http
      .get<{ medicos: MedicoListItem[] }>(`${this.API}/medicos`)
      .pipe(map((r) => r.medicos));
  }

  getDisponibilidad(idMedico: number, desde: string, hasta: string): Observable<DisponibilidadAdminBloque[]> {
    return this.http.get<DisponibilidadAdminBloque[]>(
      `${this.API}/medicos/${idMedico}/disponibilidad?desde=${desde}&hasta=${hasta}`
    );
  }

  crearDisponibilidad(
    idMedico: number,
    bloques: Partial<DisponibilidadAdminBloque>[]
  ): Observable<DisponibilidadAdminBloque[]> {
    return this.http.post<DisponibilidadAdminBloque[]>(
      `${this.API}/medicos/${idMedico}/disponibilidad`,
      { bloques }
    );
  }

  actualizarDisponibilidad(
    id: number,
    cambios: Pick<DisponibilidadAdminBloque, 'fecha' | 'hora_inicio' | 'hora_fin' | 'estado'>
  ): Observable<DisponibilidadAdminBloque> {
    return this.http.patch<DisponibilidadAdminBloque>(
      `${this.API}/disponibilidad/${id}`,
      cambios
    );
  }

  eliminarDisponibilidad(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API}/disponibilidad/${id}`
    );
  }
}
