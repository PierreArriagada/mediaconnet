import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../app/core/services/auth.service';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/auth`;

const mockPatientResponse = {
  token: 'test-token-paciente',
  user: { id: '2', email: 'paciente1@mediconnect.cl', name: 'Laura Mora', role: 'Paciente' },
};
const mockAdminResponse = {
  token: 'test-token-admin',
  user: { id: '1', email: 'admin@mediconnect.cl', name: 'Eduardo Guerrero', role: 'Administrador' },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service  = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false when no token is stored', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return null for getCurrentUser when not logged in', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('should authenticate patient user with correct credentials', (done) => {
    service.login({ email: 'paciente1@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: (res) => {
        expect(res.user.role).toBe('Paciente');
        expect(res.user.name).toBe('Laura Mora');
        done();
      },
    });
    httpMock.expectOne(`${API}/login`).flush(mockPatientResponse);
  });

  it('should reject login with wrong password', (done) => {
    service.login({ email: 'paciente1@mediconnect.cl', password: 'wrong' }).subscribe({
      error: (err) => {
        expect(err.error.message).toContain('Credenciales');
        done();
      },
    });
    httpMock.expectOne(`${API}/login`).flush(
      { message: 'Credenciales incorrectas. Verifica tu correo y contraseña.' },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('should reject login with unknown email', (done) => {
    service.login({ email: 'unknown@test.cl', password: 'mediconnect2026' }).subscribe({
      error: (err) => {
        expect(err.error.message).toBeTruthy();
        done();
      },
    });
    httpMock.expectOne(`${API}/login`).flush(
      { message: 'Credenciales incorrectas. Verifica tu correo y contraseña.' },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('should store token after successful login', (done) => {
    service.login({ email: 'admin@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: () => {
        expect(localStorage.getItem('token')).toBeTruthy();
        expect(service.isAuthenticated()).toBeTrue();
        done();
      },
    });
    httpMock.expectOne(`${API}/login`).flush(mockAdminResponse);
  });

  it('should clear storage on logout', (done) => {
    service.login({ email: 'admin@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: () => {
        service.logout();
        expect(service.isAuthenticated()).toBeFalse();
        expect(service.getCurrentUser()).toBeNull();
        done();
      },
    });
    httpMock.expectOne(`${API}/login`).flush(mockAdminResponse);
  });
});


describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false when no token is stored', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return null for getCurrentUser when not logged in', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('should authenticate mock patient user with correct credentials', (done) => {
    service.login({ email: 'paciente1@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: (res) => {
        expect(res.user.role).toBe('Paciente');
        expect(res.user.name).toBe('Laura Mora');
        done();
      },
      error: () => {
        fail('Login should succeed with valid credentials');
        done();
      },
    });
  });

  it('should reject login with wrong password', (done) => {
    service.login({ email: 'paciente1@mediconnect.cl', password: 'wrong' }).subscribe({
      next: () => {
        fail('Login should fail with wrong password');
        done();
      },
      error: (err) => {
        expect(err.error.message).toContain('Credenciales');
        done();
      },
    });
  });

  it('should reject login with unknown email', (done) => {
    service.login({ email: 'unknown@test.cl', password: 'mediconnect2026' }).subscribe({
      next: () => {
        fail('Login should fail with unknown email');
        done();
      },
      error: (err) => {
        expect(err.error.message).toBeTruthy();
        done();
      },
    });
  });

  it('should store token after successful login', (done) => {
    service.login({ email: 'admin@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: () => {
        expect(localStorage.getItem('token')).toBeTruthy();
        expect(service.isAuthenticated()).toBeTrue();
        done();
      },
    });
  });

  it('should clear storage on logout', (done) => {
    service.login({ email: 'admin@mediconnect.cl', password: 'mediconnect2026' }).subscribe({
      next: () => {
        service.logout();
        expect(service.isAuthenticated()).toBeFalse();
        expect(service.getCurrentUser()).toBeNull();
        done();
      },
    });
  });
});
