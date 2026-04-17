/** Interfaces de dominio para Usuario y Autenticación */

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
}

export type UserRole = 'Paciente' | 'Medico' | 'Administrador';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
