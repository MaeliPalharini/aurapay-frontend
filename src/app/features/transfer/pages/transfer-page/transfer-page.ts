import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-transfer-page',
  standalone: false,
  templateUrl: './transfer-page.html',
  styleUrls: ['./transfer-page.scss']
})
export class TransferPage implements OnInit {
  customerId!: number;
  errorMessage?: string;

  ngOnInit(): void {
    // Sempre busca o customerId do localStorage
    const customerIdStr = localStorage.getItem('customerId');
    if (!customerIdStr) {
      this.errorMessage = 'Usuário não autenticado. Faça login.';
      return;
    }
    this.customerId = Number(customerIdStr);
    if (Number.isNaN(this.customerId) || this.customerId <= 0) {
      this.errorMessage = 'ID do cliente inválido.';
      return;
    }
    this.loadTransfers();
  }

  loadTransfers() {
    // Lógica para carregar transferências
  }
}


export {};
