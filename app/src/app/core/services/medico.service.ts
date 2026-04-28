import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
