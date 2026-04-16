import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor funcional (Standalone) que agrega el token Bearer
 * a todas las peticiones HTTP salientes hacia el backend.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  if (token) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authReq);
  }

  return next(req);
};
