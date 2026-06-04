import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Centraliza a autenticação de TODAS as chamadas HTTP:
//  - injeta `Authorization: Bearer <token>` nas rotas autenticadas;
//  - deixa passar sem token apenas as rotas públicas (ver isPublicRoute);
//  - em 401/403 (token ausente/expirado) faz logout e manda pro login.
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isPublic = this.isPublicRoute(req);
    const token = this.auth.getToken();

    const authReq =
      !isPublic && token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next.handle(authReq).pipe(
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403) &&
          !isPublic
        ) {
          // Sessão expirada → limpa e volta pro login.
          this.auth.logout();
          this.router.navigate(['/customers/new']);
        }
        return throwError(() => error);
      })
    );
  }

  // Rotas públicas (NÃO enviam token): cadastro, login e webhook do PIX.
  // Todo o resto (wallet, depósito, PIX criar/consultar/simular, cofrinhos)
  // exige Bearer token.
  private isPublicRoute(req: HttpRequest<unknown>): boolean {
    const url = req.url;
    // POST /customers (cadastro) — sem capturar /customers/:id/...
    if (req.method === 'POST' && /\/customers(\?.*)?$/.test(url)) {
      return true;
    }
    // POST /customers/login
    if (/\/customers\/login(\?.*)?$/.test(url)) {
      return true;
    }
    // POST /pix/webhook
    if (url.includes('/pix/webhook')) {
      return true;
    }
    return false;
  }
}