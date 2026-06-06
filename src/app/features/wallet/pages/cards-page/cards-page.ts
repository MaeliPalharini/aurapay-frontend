import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CardDepositResponse } from '../../models/card-deposit.models';

interface WalletCard {
  brand: string;
  flag: 'visa' | 'mastercard';
  last4: string;
  theme: 'teal' | 'purple' | 'orange' | 'dark' | 'red';
}

@Component({
  selector: 'app-cards-page',
  standalone: false,
  templateUrl: './cards-page.html',
  styleUrls: ['./cards-page.scss'],
})
export class CardsPage implements OnInit {
  customerId: number | null = null;
  errorMessage = '';
  successMessage = '';

  // Cartões da carteira. Empilhados; ao clicar, o cartão sobe para o topo.
  cards: WalletCard[] = [
    { brand: 'AuraPay', flag: 'visa', last4: '4589', theme: 'teal' },
    { brand: 'Nubank', flag: 'mastercard', last4: '7720', theme: 'purple' },
    { brand: 'Santander', flag: 'visa', last4: '1043', theme: 'red' },
    { brand: 'Itaú', flag: 'mastercard', last4: '9981', theme: 'orange' },
  ];
  activeCardIndex = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const customerIdStr = localStorage.getItem('customerId');
    if (!customerIdStr) {
      this.errorMessage = 'Usuário não autenticado. Faça login.';
      return;
    }
    this.customerId = Number(customerIdStr);
    if (Number.isNaN(this.customerId) || this.customerId <= 0) {
      this.errorMessage = 'ID do cliente inválido.';
      this.customerId = null;
    }
  }

  selectCard(index: number): void {
    this.activeCardIndex = index;
  }

  // Recarga por cartão aprovada: reflete o último cartão usado de verdade no
  // topo da pilha "Meus Cartões".
  onCardDepositApproved(res: CardDepositResponse): void {
    this.successMessage = 'Recarga aprovada! Saldo atualizado na carteira.';

    if (res.last4 && res.brand) {
      const brand = res.brand.toLowerCase();
      const flag: WalletCard['flag'] = brand.includes('master') ? 'mastercard' : 'visa';
      const label = res.brand.charAt(0).toUpperCase() + res.brand.slice(1);
      const realCard: WalletCard = { brand: label, flag, last4: res.last4, theme: 'teal' };
      // Coloca no topo, sem duplicar o mesmo final.
      this.cards = [realCard, ...this.cards.filter((c) => c.last4 !== res.last4)];
      this.activeCardIndex = 0;
    }

    this.cdr.detectChanges();
  }
}