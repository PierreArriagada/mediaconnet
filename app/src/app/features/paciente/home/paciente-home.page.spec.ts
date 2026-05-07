import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  CitaPendienteConfirmacion,
  DashboardData,
  PacienteService,
} from '../../../core/services/paciente.service';
import { NotificacionesNativasService } from '../../../core/services/notificaciones-nativas.service';
import { NotificacionesPacienteStateService } from '../../../core/services/notificaciones-paciente-state.service';
import { PacienteHomePage } from './paciente-home.page';

describe('PacienteHomePage confirmacion de asistencia', () => {
  const citaPendiente: CitaPendienteConfirmacion = {
    id_cita: 55,
    fecha_cita: '2026-06-15',
    hora_cita: '10:00:00',
    modalidad: 'presencial',
    medico_nombre: 'Carla',
    medico_apellido: 'Rivas',
    nombre_especialidad: 'Cardiologia',
  };

  const dashboardData: DashboardData = {
    proximaCita: null,
    citaPendienteConfirmacion: citaPendiente,
    notificaciones: [],
    noLeidas: 0,
  };

  let pacienteService: jasmine.SpyObj<PacienteService>;
  let notificacionesNativas: jasmine.SpyObj<NotificacionesNativasService>;
  let component: PacienteHomePage;

  beforeEach(() => {
    localStorage.clear();

    pacienteService = jasmine.createSpyObj<PacienteService>('PacienteService', [
      'getDashboard',
    ]);
    pacienteService.getDashboard.and.returnValue(of(dashboardData));

    notificacionesNativas = jasmine.createSpyObj<NotificacionesNativasService>(
      'NotificacionesNativasService',
      ['notificarConfirmacionPendiente'],
    );
    notificacionesNativas.notificarConfirmacionPendiente.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        { provide: PacienteService, useValue: pacienteService },
        {
          provide: AuthService,
          useValue: { getCurrentUser: () => ({ name: 'Laura Mora' }) },
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate']),
        },
        { provide: NotificacionesNativasService, useValue: notificacionesNativas },
        {
          provide: NotificacionesPacienteStateService,
          useValue: {
            setNoLeidas: jasmine.createSpy('setNoLeidas'),
            fueronLimpiadas: () => false,
            noLeidas: () => 0,
          },
        },
      ],
    });

    component = TestBed.runInInjectionContext(() => new PacienteHomePage());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('vuelve a mostrar la confirmacion si se recarga despues de Ahora no', () => {
    component.loadDashboard();
    expect(component.showConfirmModal).toBeTrue();

    component.onCerrarModal();
    expect(component.showConfirmModal).toBeFalse();
    expect(localStorage.getItem('mc-cit-dismissed-55')).toBeNull();

    component.loadDashboard();
    expect(component.showConfirmModal).toBeTrue();
    expect(component.citaConfirmar?.id_cita).toBe(55);
    expect(notificacionesNativas.notificarConfirmacionPendiente).toHaveBeenCalledTimes(2);
  });

  it('ignora descartes antiguos guardados en localStorage', () => {
    localStorage.setItem('mc-cit-dismissed-55', Date.now().toString());

    component.loadDashboard();

    expect(component.showConfirmModal).toBeTrue();
    expect(component.citaConfirmar?.id_cita).toBe(55);
  });
});
