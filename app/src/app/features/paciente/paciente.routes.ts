import { Routes } from '@angular/router';

export const PACIENTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/paciente-home.page').then((m) => m.PacienteHomePage),
  },
  {
    path: 'reservar',
    loadComponent: () =>
      import('./reservar/reservar.page').then((m) => m.ReservarPage),
  },
  {
    path: 'profesionales/:idEspecialidad',
    loadComponent: () =>
      import('./profesionales/profesionales.page').then((m) => m.ProfesionalesPage),
  },
  {
    path: 'detalle-profesional/:idMedico',
    loadComponent: () =>
      import('./detalle-profesional/detalle-profesional.page'),
  },
  {
    path: 'elegir-horario/:idMedico',
    loadComponent: () =>
      import('./elegir-horario/elegir-horario.page'),
  },
  {
    path: 'confirmar-reserva/:idDisponibilidad',
    loadComponent: () =>
      import('./confirmar-reserva/confirmar-reserva.page'),
  },
  {
    path: 'citas/:idCita',
    loadComponent: () =>
      import('./citas/cita-detalle.page'),
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./historial/historial.page').then((m) => m.HistorialPage),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./perfil/perfil.page').then((m) => m.PerfilPage),
  },
];
