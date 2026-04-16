import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardPage } from '../../app/features/dashboard/dashboard.page';
import { AuthService } from '../../app/core/services/auth.service';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display patient name when patient is logged in', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '2', email: 'paciente1@mediconnect.cl', name: 'Laura Mora', role: 'patient' })
    );
    fixture.detectChanges();
    component.ngOnInit();
    expect(component.userName).toBe('Laura Mora');
    expect(component.roleLabel).toBe('Paciente');
    expect(component.roleColor).toBe('primary');
  });

  it('should display doctor name when doctor is logged in', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '3', email: 'medico1@mediconnect.cl', name: 'Carlos Rojas', role: 'doctor' })
    );
    component.ngOnInit();
    expect(component.userName).toBe('Carlos Rojas');
    expect(component.roleLabel).toBe('Médico');
    expect(component.roleColor).toBe('secondary');
  });

  it('should navigate to /auth/login on logout', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.logout();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should call authService.logout on logout', () => {
    const logoutSpy = spyOn(authService, 'logout');
    component.logout();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
