import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { GetWalletResponse } from '../../../customers/models/get-wallet-response.model';
import {
  ExtratoTransaction,
  ExtratoTransactionType,
} from '../../models/extrato.model';
import { finalize } from 'rxjs/operators';

// Ícone exibido em "Atividades recentes" por tipo de movimentação.
const ACTIVITY_ICON: Record<ExtratoTransactionType, string> = {
  DEPOSIT: '↓',
  PIX_RECEIVED: '⚡',
  PIGGY_BANK_DEPOSIT: '🐷',
  PIGGY_BANK_WITHDRAW: '🏦',
};

@Component({
  selector: 'app-wallet-details-page',
  standalone: false,
  templateUrl: './wallet-details-page.html',
  styleUrls: ['./wallet-details-page.scss'],
})
export class WalletDetailsPage implements OnInit {
  wallet: GetWalletResponse | null = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Atividades recentes reais (vindas do extrato), as mais recentes primeiro.
  recentActivities: ExtratoTransaction[] = [];
  isLoadingActivities = false;

  customerId: number | null = null;

  isAddFundsOpen = false;
  isSubmittingAddFunds = false;
  addFundsForm: ReturnType<FormBuilder['group']>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly customerApiService: CustomerApiService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.addFundsForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });
  }

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
    this.loadWallet();
    this.loadRecentActivities();
  }

  // Busca as movimentações reais do extrato e mostra as mais recentes.
  loadRecentActivities(): void {
    if (!this.customerId) return;

    this.isLoadingActivities = true;
    this.cdr.markForCheck();

    this.customerApiService
      .getExtrato(this.customerId)
      .pipe(
        finalize(() => {
          this.isLoadingActivities = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          // A lista já vem da mais recente pra mais antiga; mostra só as 2 primeiras.
          this.recentActivities = (response.transactions ?? []).slice(0, 2);
          this.cdr.markForCheck();
        },
        error: () => {
          // Falha aqui não deve quebrar a página da carteira.
          this.recentActivities = [];
          this.cdr.markForCheck();
        },
      });
  }

  activityIcon(type: ExtratoTransactionType): string {
    return ACTIVITY_ICON[type] ?? '💳';
  }

  formatActivityAmount(tx: ExtratoTransaction): string {
    const sinal = tx.direction === 'CREDIT' ? '+' : '-';
    const valor = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(tx.amount ?? 0);
    return `${sinal} ${valor}`;
  }

  trackByActivityId(_index: number, tx: ExtratoTransaction): string {
    return tx.id;
  }

  loadWallet(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    this.customerApiService.getWalletByCustomerId(this.customerId).subscribe({
      next: (response: GetWalletResponse) => {
        this.wallet = response;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível consultar a carteira.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openAddFunds(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isAddFundsOpen = true;
    this.isSubmittingAddFunds = false;
    this.addFundsForm.reset({ amount: null });

    // Garante que o modal e o form renderizem imediatamente
    queueMicrotask(() => this.cdr.markForCheck());
  }

  closeAddFunds(): void {
    this.isAddFundsOpen = false;
  }

  addFunds(): void {
    if (!this.customerId) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (this.addFundsForm.invalid) {
      this.errorMessage = 'Informe um valor válido para adicionar saldo.';
      this.cdr.markForCheck();
      return;
    }

    const amount = Number(this.addFundsForm.value.amount);

    this.isSubmittingAddFunds = true;
    this.cdr.markForCheck();

    this.customerApiService
      .depositToWallet(this.customerId, amount)
      .pipe(
        finalize(() => {
          this.isSubmittingAddFunds = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Saldo adicionado com sucesso.';
          this.isAddFundsOpen = false;
          this.loadWallet();
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || error?.message || 'Não foi possível adicionar saldo.';
          this.cdr.markForCheck();
        },
      });
  }
}
