import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  ActualizarPerfilPacientePayload,
  CrearCitaPayload,
  PacienteService,
} from '../../core/services/paciente.service';

describe('PacienteService flujos críticos', () => {
  let service: PacienteService;
  let httpMock: HttpTestingController;
  const api = `${environment.apiUrl}/paciente`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PacienteService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PacienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('crea una reserva directa con el payload esperado', () => {
    const payload: CrearCitaPayload = {
      id_medico: 12,
      id_especialidad: 4,
      id_disponibilidad: 900,
      modalidad: 'presencial',
      motivo_consulta: 'Control anual',
    };

    service.crearCita(payload).subscribe((resp) => {
      expect(resp).toEqual({ message: 'Cita creada.', id_cita: 321 });
    });

    const req = httpMock.expectOne(`${api}/reservar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'Cita creada.', id_cita: 321 });
  });

  it('reagenda una cita existente sin usar el endpoint de creación', () => {
    service.reagendarCita(321, 900).subscribe((resp) => {
      expect(resp).toEqual({ message: 'Cita reagendada.' });
    });

    const req = httpMock.expectOne(`${api}/cita/321/reagendar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ id_disponibilidad: 900 });
    req.flush({ message: 'Cita reagendada.' });

    httpMock.expectNone(`${api}/reservar`);
  });

  it('cancela y confirma asistencia con endpoints específicos de cita', () => {
    service.cancelarCita(321).subscribe((resp) => {
      expect(resp.message).toBe('Cita cancelada.');
    });

    const cancelarReq = httpMock.expectOne(`${api}/cita/321/cancelar`);
    expect(cancelarReq.request.method).toBe('PATCH');
    expect(cancelarReq.request.body).toEqual({});
    cancelarReq.flush({ message: 'Cita cancelada.' });

    service.confirmarAsistencia(321).subscribe((resp) => {
      expect(resp.message).toBe('Asistencia confirmada.');
    });

    const confirmarReq = httpMock.expectOne(`${api}/cita/321/confirmar-asistencia`);
    expect(confirmarReq.request.method).toBe('PATCH');
    expect(confirmarReq.request.body).toEqual({});
    confirmarReq.flush({ message: 'Asistencia confirmada.' });
  });

  it('sincroniza la bandeja de notificaciones con consultas y acciones destructivas explícitas', () => {
    service.getNotificaciones({ limit: 20, offset: 40 }).subscribe((resp) => {
      expect(resp.noLeidas).toBe(2);
      expect(resp.total).toBe(55);
    });

    const listarReq = httpMock.expectOne(`${api}/notificaciones?limit=20&offset=40`);
    expect(listarReq.request.method).toBe('GET');
    listarReq.flush({ notificaciones: [], noLeidas: 2, total: 55, limit: 20, offset: 40 });

    service.marcarNotificacionesLeidas().subscribe((resp) => {
      expect(resp.message).toBe('Marcadas.');
    });

    const marcarReq = httpMock.expectOne(`${api}/notificaciones/marcar-leidas`);
    expect(marcarReq.request.method).toBe('PATCH');
    expect(marcarReq.request.body).toEqual({});
    marcarReq.flush({ message: 'Marcadas.' });

    service.eliminarNotificacion(77).subscribe((resp) => {
      expect(resp.message).toBe('Eliminada.');
    });

    const eliminarReq = httpMock.expectOne(`${api}/notificaciones/77`);
    expect(eliminarReq.request.method).toBe('DELETE');
    eliminarReq.flush({ message: 'Eliminada.' });

    service.limpiarNotificaciones().subscribe((resp) => {
      expect(resp.message).toBe('Todas eliminadas.');
    });

    const limpiarReq = httpMock.expectOne(`${api}/notificaciones`);
    expect(limpiarReq.request.method).toBe('DELETE');
    limpiarReq.flush({ message: 'Todas eliminadas.' });
  });

  it('consulta y actualiza perfil del paciente sin cambiar el contrato de contraseña', () => {
    service.getPerfil().subscribe((resp) => {
      expect(resp.correo).toBe('laura@example.com');
      expect(resp.alertas).toBe(3);
    });

    const perfilReq = httpMock.expectOne(`${api}/perfil`);
    expect(perfilReq.request.method).toBe('GET');
    perfilReq.flush({
      nombre: 'Laura',
      apellido: 'Mora',
      correo: 'laura@example.com',
      telefono: '+56912345678',
      estado: 'activo',
      fecha_registro: '2026-01-01',
      rut: '12345678-9',
      fecha_nacimiento: '1990-01-01',
      direccion: null,
      comuna: null,
      ciudad: null,
      contacto_emergencia: null,
      telefono_emergencia: null,
      proxima_cita: null,
      alertas: 3,
    });

    const perfilPayload: ActualizarPerfilPacientePayload = {
      nombre: 'Laura',
      apellido: 'Mora',
      correo: 'laura@example.com',
      telefono: '+56912345678',
    };

    service.actualizarPerfil(perfilPayload).subscribe((resp) => {
      expect(resp.message).toBe('Perfil actualizado.');
    });

    const actualizarReq = httpMock.expectOne(`${api}/perfil`);
    expect(actualizarReq.request.method).toBe('PUT');
    expect(actualizarReq.request.body).toEqual(perfilPayload);
    actualizarReq.flush({ message: 'Perfil actualizado.' });

    service.cambiarPassword({
      contrasena_actual: 'Actual1234',
      contrasena_nueva: 'Nueva1234',
    }).subscribe((resp) => {
      expect(resp.message).toBe('Contraseña actualizada.');
    });

    const passwordReq = httpMock.expectOne(`${api}/perfil/password`);
    expect(passwordReq.request.method).toBe('PATCH');
    expect(passwordReq.request.body).toEqual({
      contrasena_actual: 'Actual1234',
      contrasena_nueva: 'Nueva1234',
    });
    passwordReq.flush({ message: 'Contraseña actualizada.' });
  });
});
