import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from '../../../app/core/guards/auth.guard';
import { AuthService } from '../../../app/core/services/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should allow access when user is authenticated', () => {
    localStorage.setItem('token', 'dev-token-test');
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );
    expect(result).toBeTrue();
  });

  it('should deny access and redirect when user is not authenticated', () => {
    const navigateSpy = spyOn(router, 'navigate');
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );
    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });
});
