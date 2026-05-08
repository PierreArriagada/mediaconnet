import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminHomePage } from '../../app/features/admin/home/admin-home.page';
import { AuthService } from '../../app/core/services/auth.service';

describe('AdminHomePage', () => {
  let component: AdminHomePage;
  let fixture: ComponentFixture<AdminHomePage>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', email: 'admin@mediconnect.cl', name: 'Admin MediConnect', role: 'Administrador' }),
    );

    await TestBed.configureTestingModule({
      imports: [AdminHomePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminHomePage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the component for an administrator', () => {
    expect(component).toBeTruthy();
    expect(component.firstName).toBe('Admin');
  });

  it('should navigate from quick actions', () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');

    component.irA('/admin/medicos');

    expect(navigateSpy).toHaveBeenCalledWith('/admin/medicos');
  });

  it('should clear the session on logout', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.cerrarSesion();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should logout and redirect to login if role is not administrator', () => {
    localStorage.setItem('token', 'patient-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '2', email: 'paciente@mediconnect.cl', name: 'Laura Mora', role: 'Paciente' }),
    );

    const nonAdminFixture = TestBed.createComponent(AdminHomePage);
    const nonAdminComponent = nonAdminFixture.componentInstance;
    const logoutSpy = spyOn(authService, 'logout').and.callThrough();
    const navigateSpy = spyOn(router, 'navigate');

    nonAdminComponent.ngOnInit();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], { replaceUrl: true });
  });
});
