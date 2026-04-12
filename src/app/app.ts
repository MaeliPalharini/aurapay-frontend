import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('aurapay-frontend');

  // Some o menu "Cadastro" quando já existir um customerId salvo.
  public isCustomerRegistered = false;

  constructor() {
    this.refreshCustomerRegistration();


    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === 'customerId') {
        this.refreshCustomerRegistration();
      }
    });
  }

  private refreshCustomerRegistration(): void {
    const id = sessionStorage.getItem('customerId');
    this.isCustomerRegistered = !!id && !Number.isNaN(Number(id)) && Number(id) > 0;
  }
}
