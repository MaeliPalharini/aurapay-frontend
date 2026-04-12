import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { PiggyBankApiService } from '../../../../core/api/piggy-bank-api.service';
import { PiggyBankSummary, PiggyBankYieldItem } from '../../models/piggy-bank.models';

@Component({
  selector: 'app-piggy-bank-details-page',
  standalone: false,
  templateUrl: './piggy-bank-details-page.html',
  styleUrls: ['./piggy-bank-details-page.scss'],
})
export class PiggyBankDetailsPage implements OnInit {
  customerId: number | null = null;
  piggyBankId: number | null = null;

  piggyBank: PiggyBankSummary | null = null;
  yieldHistory: PiggyBankYieldItem[] = [];

  walletBalance: number | null = null;
  walletStatus: string | null = null;

  isLoading = false;
  isLoadingWallet = false;
  isLoadingYield = false;

  errorMessage = '';
  successMessage = '';

  isDepositOpen = false;
  isWithdrawOpen = false;

  depositForm: ReturnType<FormBuilder['group']>;
  withdrawForm: ReturnType<FormBuilder['group']>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly piggyBankApi: PiggyBankApiService,
    private readonly customerApi: CustomerApiService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.depositForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });

    this.withdrawForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const customerIdParam = this.route.snapshot.queryParamMap.get('customerId') ?? sessionStorage.getItem('customerId');

    const piggyBankId = Number(idParam);
    const customerId = Number(customerIdParam);

    if (!idParam || Number.isNaN(piggyBankId) || piggyBankId <= 0) {
      this.errorMessage = 'ID do cofrinho inválido.';
      this.cdr.detectChanges();
      return;
    }

    if (!customerIdParam || Number.isNaN(customerId) || customerId <= 0) {
      this.errorMessage = 'Cliente não informado. Volte para a lista e informe o customerId.';
      this.cdr.detectChanges();
      return;
    }

    this.piggyBankId = piggyBankId;
    this.customerId = customerId;
    sessionStorage.setItem('customerId', String(customerId));

    this.loadAll();
  }

  loadAll(): void {
    this.loadWallet();
    this.loadPiggyBank();
    this.loadYield();
  }

  loadWallet(): void {
    if (!this.customerId) return;

    this.isLoadingWallet = true;
    this.customerApi.getWalletByCustomerId(this.customerId).subscribe({
      next: (res) => {
        this.walletBalance = typeof res?.balance === 'number' ? res.balance : Number(res?.balance);
        this.walletStatus = (res?.walletStatus as any) ?? null;
        this.isLoadingWallet = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.walletBalance = null;
        this.walletStatus = null;
        this.isLoadingWallet = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPiggyBank(): void {
    if (!this.customerId || !this.piggyBankId) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.piggyBankApi.listPiggyBanks(this.customerId).subscribe({
      next: (res) => {
        const found = (res?.piggyBanks ?? []).find((p) => p.id === this.piggyBankId) ?? null;
        this.piggyBank = found;
        this.isLoading = false;

        if (!found) {
          this.errorMessage = 'Cofrinho não encontrado para este cliente.';
        }

        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível carregar o cofrinho.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadYield(): void {
    if (!this.piggyBankId) return;

    this.isLoadingYield = true;
    this.yieldHistory = [];

    this.piggyBankApi.getYieldHistory(this.piggyBankId).subscribe({
      next: (res) => {
        this.yieldHistory = res?.yields ?? [];
        this.isLoadingYield = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível carregar os rendimentos.';
        this.isLoadingYield = false;
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    if (this.customerId) {
      this.router.navigate(['/cofrinhos'], { queryParams: { customerId: this.customerId } });
      return;
    }
    this.router.navigate(['/cofrinhos']);
  }

  canDeposit(): boolean {
    if (!this.piggyBank || this.piggyBank.status !== 'ACTIVE') return false;
    if (this.walletBalance === null || this.walletBalance === undefined) return true;
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') return false;
    return this.walletBalance > 0;
  }

  openDeposit(): void {
    this.clearMessages();
    if (!this.canDeposit()) {
      this.errorMessage = this.getDepositDisabledReason();
      this.cdr.detectChanges();
      return;
    }
    this.isDepositOpen = true;
    this.depositForm.reset({ amount: null });
  }

  submitDeposit(): void {
    if (!this.customerId || !this.piggyBankId) return;
    this.clearMessages();

    if (this.depositForm.invalid) {
      this.errorMessage = 'Informe um valor válido para depósito.';
      return;
    }

    const amount = Number(this.depositForm.value.amount);

    if (this.walletBalance !== null && this.walletBalance !== undefined && amount > this.walletBalance) {
      this.errorMessage = `Saldo insuficiente na carteira. Saldo atual: ${this.walletBalance.toFixed(2)}`;
      return;
    }

    this.piggyBankApi.deposit(this.piggyBankId, { customerId: String(this.customerId), amount }).subscribe({
      next: (res) => {
        this.successMessage = 'Depósito realizado com sucesso.';
        this.isDepositOpen = false;

        // Atualiza valores imediatamente com o retorno transacional do backend
        if (this.piggyBank) {
          this.piggyBank = {
            ...this.piggyBank,
            name: res?.name ?? this.piggyBank.name,
            currentAmount: typeof res?.currentAmount === 'number' ? res.currentAmount : this.piggyBank.currentAmount,
            status: (res?.piggyBankStatus as any) ?? this.piggyBank.status,
          };
        }

        // Mantém reload para sincronizar carteira e histórico de rendimentos
        this.loadAll();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível depositar no cofrinho.';
        this.loadWallet();
        this.cdr.detectChanges();
      },
    });
  }

  openWithdraw(): void {
    this.clearMessages();
    this.isWithdrawOpen = true;
    this.withdrawForm.reset({ amount: null });
  }

  submitWithdraw(): void {
    if (!this.customerId || !this.piggyBankId) return;
    this.clearMessages();

    if (this.withdrawForm.invalid) {
      this.errorMessage = 'Informe um valor válido para resgate.';
      return;
    }

    const amount = Number(this.withdrawForm.value.amount);

    this.piggyBankApi.withdraw(this.piggyBankId, { customerId: this.customerId, amount }).subscribe({
      next: (res) => {
        this.successMessage = 'Resgate realizado com sucesso.';
        this.isWithdrawOpen = false;

        // Atualiza valores imediatamente com o retorno transacional do backend
        if (this.piggyBank) {
          this.piggyBank = {
            ...this.piggyBank,
            name: res?.name ?? this.piggyBank.name,
            currentAmount: typeof res?.currentAmount === 'number' ? res.currentAmount : this.piggyBank.currentAmount,
            status: (res?.piggyBankStatus as any) ?? this.piggyBank.status,
          };
        }

        // Mantém reload para sincronizar carteira e histórico de rendimentos
        this.loadAll();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível resgatar do cofrinho.';
        this.loadWallet();
        this.cdr.detectChanges();
      },
    });
  }

  closeModals(): void {
    this.isDepositOpen = false;
    this.isWithdrawOpen = false;
  }

  getDepositDisabledReason(): string {
    if (!this.piggyBank) return 'Cofrinho não carregado.';
    if (this.piggyBank.status !== 'ACTIVE') return 'Cofrinho fechado.';
    if (this.walletBalance === null || this.walletBalance === undefined) return 'Saldo da carteira indisponível.';
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') return `Carteira indisponível (status: ${this.walletStatus}).`;
    if (this.walletBalance <= 0) return 'Saldo insuficiente na carteira.';
    return '';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
