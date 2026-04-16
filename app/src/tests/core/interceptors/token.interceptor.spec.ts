import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { tokenInterceptor } from '../../../app/core/interceptors/token.interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should add Authorization header when token is present', () => {
    localStorage.setItem('token', 'test-token-123');

    http.get('/api/test').subscribe();
    const req = httpTesting.expectOne('/api/test');

    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('should not add Authorization header when no token is stored', () => {
    http.get('/api/test').subscribe();
    const req = httpTesting.expectOne('/api/test');

    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});

