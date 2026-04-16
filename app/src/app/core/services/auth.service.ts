import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginPayload {
  email: string;
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

/** Usuarios de prueba disponibles mientras no existe backend.
 *  Contraseña única para todos: mediconnect2026
 *  Coinciden con los datos semilla de database/01_init.sql
 */
const MOCK_USERS: Record<string, AuthResponse> = {
  'paciente1@mediconnect.cl': {
    token: 'dev-token-paciente',
    user: { id: '2', email: 'paciente1@mediconnect.cl', name: 'Laura Mora', role: 'patient' },
  },
  'medico1@mediconnect.cl': {
    token: 'dev-token-medico',
    user: { id: '3', email: 'medico1@mediconnect.cl', name: 'Carlos Rojas', role: 'doctor' },
  },
  'admin@mediconnect.cl': {
    token: 'dev-token-admin',
    user: { id: '1', email: 'admin@mediconnect.cl', name: 'Eduardo Guerrero', role: 'admin' },
  },
};
const MOCK_PASSWORD = 'mediconnect2026';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/auth`;
  private _isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  /** Observable que emite el estado de autenticación en tiempo real */
  isAuthenticated$ = this._isAuthenticated.asObservable();

  /** Login: usa mock de desarrollo mientras no haya backend.
   *  Cuando el backend esté activo, reemplazar el cuerpo por la
   *  llamada HTTP real que está en el comentario de abajo.
   */
  login(payload: LoginPayload): Observable<AuthResponse> {
    const mock = MOCK_USERS[payload.email.toLowerCase()];

    if (!mock || payload.password !== MOCK_PASSWORD) {
      return throwError(() => ({
        error: { message: 'Credenciales incorrectas. Verifica tu correo y contraseña.' },
      }));
    }

    return of(mock).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this._isAuthenticated.next(true);
      })
    );

    /* ── Reemplazar el bloque anterior por esto cuando exista backend ──
    return this.http.post<AuthResponse>(`${this.API}/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this._isAuthenticated.next(true);
      })
    );
    */
  }

  /** Devuelve el usuario actualmente autenticado desde localStorage */
  getCurrentUser(): AuthResponse['user'] | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  /** Cierra sesión, borra el estado local */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._isAuthenticated.next(false);
  }

  /** Comprueba si hay un token guardado en localStorage */
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  /** Obtiene el token actual */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }
}
