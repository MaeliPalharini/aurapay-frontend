import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PiggyBankApiService } from '../../../../core/api/piggy-bank-api.service';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import {
  PiggyBankSummary,
} from '../../models/piggy-bank.models';

@Component({
  selector: 'app-piggy-bank-page',
  standalone: false,
  templateUrl: './piggy-bank-page.html',
  styleUrls: ['./piggy-bank-page.scss'],
})
export class PiggyBankPage implements OnInit {
  customerId: number | null = null;

  piggyBanks: PiggyBankSummary[] = [];
  selectedPiggyBank: PiggyBankSummary | null = null;

  isLoadingList = false;
  errorMessage = '';
  successMessage = '';

  isCreateOpen = false;
  isDepositOpen = false;
  isWithdrawOpen = false;

  createForm: ReturnType<FormBuilder['group']>;
  depositForm: ReturnType<FormBuilder['group']>;
  withdrawForm: ReturnType<FormBuilder['group']>;

  walletBalance: number | null = null;
  walletStatus: string | null = null;
  isLoadingWallet = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly piggyBankApi: PiggyBankApiService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly customerApi: CustomerApiService
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      targetAmount: [null as number | null],
    });

    this.depositForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });

    this.withdrawForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit(): void {
    let customerIdParam = this.route.snapshot.queryParamMap.get('customerId');

    if (!customerIdParam) {
      customerIdParam = sessionStorage.getItem('customerId');
    }

    if (!customerIdParam) {
      this.errorMessage = 'Cliente não informado. Informe ?customerId= na URL ou crie um cliente.';
      this.cdr.detectChanges();
      return;
    }

    const customerId = Number(customerIdParam);

    if (Number.isNaN(customerId) || customerId <= 0) {
      this.errorMessage = 'ID do cliente inválido.';
      this.cdr.detectChanges();
      return;
    }

    this.customerId = customerId;
    sessionStorage.setItem('customerId', String(customerId));

    this.loadWallet();
    this.loadPiggyBanks();
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
        // falha em carregar carteira não deve bloquear a tela; backend validará na transação
        this.walletBalance = null;
        this.walletStatus = null;
        this.isLoadingWallet = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPiggyBanks(): void {
    if (!this.customerId) return;

    this.isLoadingList = true;
    this.errorMessage = '';

    this.piggyBankApi.listPiggyBanks(this.customerId).subscribe({
      next: (res) => {
        this.piggyBanks = res?.piggyBanks ?? [];
        this.isLoadingList = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível listar os cofrinhos.';
        this.isLoadingList = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreate(): void {
    this.clearMessages();
    this.isCreateOpen = true;
    this.createForm.reset({ name: '', targetAmount: null });
  }

  submitCreate(): void {
    if (!this.customerId) return;
    this.clearMessages();

    if (this.createForm.invalid) {
      this.errorMessage = 'Preencha o nome do cofrinho.';
      return;
    }

    const name = (this.createForm.value.name ?? '').trim();
    const targetAmountRaw = this.createForm.value.targetAmount;
    const targetAmount = targetAmountRaw === null || targetAmountRaw === undefined || targetAmountRaw === ('' as any)
      ? null
      : Number(targetAmountRaw);

    this.piggyBankApi
      .createPiggyBank({
        customerId: this.customerId,
        name,
        targetAmount: targetAmount !== null && !Number.isNaN(targetAmount) ? targetAmount : null,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Cofrinho criado com sucesso.';
          this.isCreateOpen = false;
          this.loadPiggyBanks();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || error?.message || 'Não foi possível criar o cofrinho.';
          this.cdr.detectChanges();
        },
      });
  }

  canDeposit(pb?: PiggyBankSummary | null): boolean {
    // Se não sabemos saldo/status (null), não bloqueia por UX (deixa backend validar)
    if (this.walletBalance === null || this.walletBalance === undefined) return true;
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') return false;
    if (this.walletBalance <= 0) return false;
    if (pb?.status && pb.status !== 'ACTIVE') return false;
    return true;
  }

  getDepositDisabledReason(pb?: PiggyBankSummary | null): string {
    if (pb?.status && pb.status !== 'ACTIVE') return 'Cofrinho fechado.';
    if (this.walletBalance === null || this.walletBalance === undefined) return 'Saldo da carteira indisponível.';
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') return `Carteira indisponível (status: ${this.walletStatus}).`;
    if (this.walletBalance <= 0) return 'Saldo insuficiente na carteira.';
    return '';
  }

  openDeposit(pb: PiggyBankSummary): void {
    this.clearMessages();

    if (!this.canDeposit(pb)) {
      this.errorMessage = this.getDepositDisabledReason(pb) || 'Não é possível depositar.';
      this.cdr.detectChanges();
      return;
    }

    this.selectedPiggyBank = pb;
    this.isDepositOpen = true;
    this.depositForm.reset({ amount: null });
  }

  submitDeposit(): void {
    if (!this.customerId || !this.selectedPiggyBank) return;
    this.clearMessages();

    if (this.depositForm.invalid) {
      this.errorMessage = 'Informe um valor válido para depósito.';
      return;
    }

    const amount = Number(this.depositForm.value.amount);

    // validação visual (best-effort); backend ainda é a fonte de verdade
    if (this.walletBalance !== null && this.walletBalance !== undefined && amount > this.walletBalance) {
      this.errorMessage = `Saldo insuficiente na carteira. Saldo atual: ${this.walletBalance.toFixed(2)}`;
      return;
    }

    this.piggyBankApi
      .deposit(this.selectedPiggyBank.id, {
        customerId: this.customerId,
        amount,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Depósito realizado com sucesso.';
          this.isDepositOpen = false;
          this.loadWallet();
          this.loadPiggyBanks();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || error?.message || 'Não foi possível depositar no cofrinho.';
          this.loadWallet();
          this.cdr.detectChanges();
        },
      });
  }

  openWithdraw(pb: PiggyBankSummary): void {
    this.clearMessages();
    this.selectedPiggyBank = pb;
    this.isWithdrawOpen = true;
    this.withdrawForm.reset({ amount: null });
  }

  submitWithdraw(): void {
    if (!this.customerId || !this.selectedPiggyBank) return;
    this.clearMessages();

    if (this.withdrawForm.invalid) {
      this.errorMessage = 'Informe um valor válido para resgate.';
      return;
    }

    const amount = Number(this.withdrawForm.value.amount);

    this.piggyBankApi
      .withdraw(this.selectedPiggyBank.id, {
        customerId: this.customerId,
        amount,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Resgate realizado com sucesso.';
          this.isWithdrawOpen = false;
          this.loadWallet();
          this.loadPiggyBanks();
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
    this.isCreateOpen = false;
    this.isDepositOpen = false;
    this.isWithdrawOpen = false;
    this.selectedPiggyBank = null;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
