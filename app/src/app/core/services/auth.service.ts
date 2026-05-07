import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificacionesAdminStateService } from './notificaciones-admin-state.service';
import { NotificacionesMedicoStateService } from './notificaciones-medico-state.service';
import { NotificacionesPacienteStateService } from './notificaciones-paciente-state.service';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  telefono?: string;
  rut: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly notificacionesPacienteState = inject(NotificacionesPacienteStateService);
  private readonly notificacionesMedicoState = inject(NotificacionesMedicoStateService);
  private readonly notificacionesAdminState = inject(NotificacionesAdminStateService);
  private _isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  isAuthenticated$ = this._isAuthenticated.asObservable();

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, payload).pipe(
      tap((res: AuthResponse) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.reiniciarEstadosNotificaciones();
        this._isAuthenticated.next(true);
      })
    );
  }

  getCurrentUser(): AuthResponse['user'] | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.reiniciarEstadosNotificaciones();
    this._isAuthenticated.next(false);
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Registro: id_rol = 2 (Paciente) lo fuerza el backend según 01_init.sql */
  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<void>(`${this.API}/register`, payload);
  }

  /** Anti-enumeración: el backend siempre responde 200 independiente del correo */
  forgotPassword(payload: ForgotPasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.API}/forgot-password`, payload);
  }

  /** Restablece la contraseña mediante token de recuperación */
  resetPassword(payload: ResetPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/reset-password`, payload);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private reiniciarEstadosNotificaciones(): void {
    this.notificacionesPacienteState.reiniciar();
    this.notificacionesMedicoState.reiniciar();
    this.notificacionesAdminState.reiniciar();
  }
}
