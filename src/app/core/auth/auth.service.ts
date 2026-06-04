import { Injectable } from '@angular/core';

// Chaves de sessão. O JWT expira em 120 min (config do backend); quando uma
// chamada autenticada voltar 401/403, o AuthInterceptor chama logout().
const TOKEN_KEY = 'aurapay_token';
const CUSTOMER_ID_KEY = 'aurapay_customerId';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCustomerId(): number | null {
    const raw = localStorage.getItem(CUSTOMER_ID_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Persiste a sessão após login bem-sucedido.
  setSession(token: string, customerId: number): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_ID_KEY, String(customerId));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_ID_KEY);
  }
}