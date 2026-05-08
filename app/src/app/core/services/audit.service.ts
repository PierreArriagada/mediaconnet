import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLog {
  id_audit_log: number | string;
  id_usuario_admin: number;
  nombre_usuario_admin: string;
  email_usuario_admin: string;
  tipo_accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VIEW';
  categoria: 'MEDICO' | 'ESPECIALIDAD' | 'PACIENTE' | 'CITA' | 'SOLICITUD' | 'DISPONIBILIDAD' | 'PERFIL_ADMIN' | 'SEGURIDAD';
  entidad_tipo: string | null;
  entidad_id: number | null;
  ip_origen: string | null;
  endpoint_api: string | null;
  metodo_http: string | null;
  codigo_respuesta: number | null;
  fecha_evento: string;
  duracion_ms: number | null;
  estado: 'completado' | 'error' | 'rechazado';
}

export interface AuditResponse {
  logs: AuditLog[];
  paginacion: {
    total: number;
    limit: number;
    offset: number;
    paginas: number;
    pagina_actual: number;
  };
}

export interface AuditResumen {
  total_eventos: number;
  eventos_hoy: number;
  eventos_error: number;
  administradores: number;
}

export interface AuditFiltros {
  categoria?: string;
  tipoAccion?: string;
  busqueda?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin/auditoria`;

  obtenerLogs(filtros: AuditFiltros = {}): Observable<AuditResponse> {
    let params = new HttpParams();

    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.tipoAccion) params = params.set('tipoAccion', filtros.tipoAccion);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (typeof filtros.limit === 'number') params = params.set('limit', filtros.limit);
    if (typeof filtros.offset === 'number') params = params.set('offset', filtros.offset);

    return this.http.get<AuditResponse>(`${this.API}/logs`, { params });
  }

  obtenerResumen(): Observable<AuditResumen> {
    return this.http.get<AuditResumen>(`${this.API}/resumen`);
  }
}
