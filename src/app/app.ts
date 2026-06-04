import { Component, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('aurapay-frontend');

  // Some o menu e o botão "Sair" quando não há sessão ativa.
  public isCustomerRegistered = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    this.refreshCustomerRegistration();

    // Reavalia a cada navegação — assim o botão "Sair" aparece assim que a
    // pessoa entra (login/cadastro) e começa a navegar.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.refreshCustomerRegistration());

    // Mantém em sincronia entre abas.
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === 'aurapay_token' || e.key === 'customerId') {
        this.refreshCustomerRegistration();
      }
    });
  }

  logout(): void {
    this.auth.logout();
    // Limpa também as chaves legadas usadas pelas outras páginas.
    localStorage.removeItem('customerId');
    localStorage.removeItem('user');
    sessionStorage.removeItem('customerId');
    this.refreshCustomerRegistration();
    this.router.navigate(['/customers/new']);
  }

  private refreshCustomerRegistration(): void {
    const id = this.auth.getCustomerId() ?? Number(localStorage.getItem('customerId'));
    this.isCustomerRegistered =
      this.auth.isAuthenticated() || (!!id && !Number.isNaN(id) && id > 0);
  }
}
