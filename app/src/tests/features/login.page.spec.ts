import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { LoginPage } from '../../app/features/auth/login/login.page';
import { AuthService } from '../../app/core/services/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage, ReactiveFormsModule],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty fields', () => {
    expect(component.loginForm.value).toEqual({ email: '', password: '' });
  });

  it('should mark form as invalid when empty', () => {
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('should mark form as valid with correct email and password', () => {
    component.loginForm.setValue({
      email: 'paciente1@mediconnect.cl',
      password: 'mediconnect2026',
    });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should mark email control as invalid for bad format', () => {
    component.loginForm.get('email')?.setValue('not-an-email');
    expect(component.loginForm.get('email')?.invalid).toBeTrue();
  });

  it('should navigate to /dashboard on successful login', async () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.loginForm.setValue({
      email: 'paciente1@mediconnect.cl',
      password: 'mediconnect2026',
    });
    await component.onLogin();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
