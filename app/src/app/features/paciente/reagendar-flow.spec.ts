import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesPacienteStateService } from '../../core/services/notificaciones-paciente-state.service';
import {
  DisponibilidadSlot,
  PacienteService,
} from '../../core/services/paciente.service';
import ElegirHorarioPage from './elegir-horario/elegir-horario.page';
import ConfirmarReservaPage from './confirmar-reserva/confirmar-reserva.page';

describe('flujo de reagendamiento paciente', () => {
  const slot: DisponibilidadSlot = {
    id_disponibilidad: 900,
    id_medico: 12,
    fecha: '2026-06-15',
    hora_inicio: '10:00:00',
    hora_fin: '10:30:00',
  };

  const authService = {
    getCurrentUser: () => ({ name: 'Laura Mora' }),
  };

  const notificacionesState = {
    setNoLeidas: jasmine.createSpy('setNoLeidas'),
  };

  it('propaga el id de cita al confirmar un nuevo horario', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const pacienteService = jasmine.createSpyObj<PacienteService>('PacienteService', [
      'getDisponibilidadMedico',
    ]);
    pacienteService.getDisponibilidadMedico.and.returnValue(of({
      medico: {
        id_medico: 12,
        nombre: 'Carla',
        apellido: 'Rivas',
        id_especialidad: 4,
        nombre_especialidad: 'Cardiologia',
      },
      disponibilidad: [slot],
      noLeidas: 3,
    }));

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: PacienteService, useValue: pacienteService },
        { provide: NotificacionesPacienteStateService, useValue: notificacionesState },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ idMedico: '12' }),
              queryParamMap: convertToParamMap({ reagendarCita: '321' }),
            },
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ElegirHorarioPage());

    component.ngOnInit();
    component.seleccionarSlot(slot);
    component.confirmarCita();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/paciente/confirmar-reserva', 900],
      {
        queryParams: jasmine.objectContaining({
          reagendarCita: 321,
          idMedico: 12,
          idEspecialidad: 4,
        }),
      },
    );
  });

  it('usa PATCH de reagendamiento y no crea una cita nueva', fakeAsync(() => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const pacienteService = jasmine.createSpyObj<PacienteService>('PacienteService', [
      'crearCita',
      'reagendarCita',
    ]);
    pacienteService.crearCita.and.returnValue(of({ message: 'creada', id_cita: 999 }));
    pacienteService.reagendarCita.and.returnValue(of({ message: 'reagendada' }));

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: PacienteService, useValue: pacienteService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ idDisponibilidad: '900' }),
              queryParamMap: convertToParamMap({ reagendarCita: '321' }),
              queryParams: {
                idMedico: '12',
                idEspecialidad: '4',
                nombre: 'Carla',
                apellido: 'Rivas',
                especialidad: 'Cardiologia',
                fecha: '2026-06-15',
                horaInicio: '10:00:00',
                horaFin: '10:30:00',
                reagendarCita: '321',
              },
            },
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ConfirmarReservaPage());

    component.ngOnInit();
    component.reservar();

    expect(pacienteService.reagendarCita).toHaveBeenCalledOnceWith(321, 900);
    expect(pacienteService.crearCita).not.toHaveBeenCalled();

    tick(2500);
    expect(router.navigate).toHaveBeenCalledWith(['/paciente/citas', 321]);
  }));
});
