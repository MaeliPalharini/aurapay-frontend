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

  selectedPresetImage: string | null = null;

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
    this.piggyBankApi.listPiggyBanks(this.customerId).subscribe({
      next: (res: { piggyBanks: any[] }) => {
        this.piggyBanks = (res.piggyBanks || []).map((pb) => ({
          ...pb,
          image: pb.imageUrl || null
        }));
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Erro ao carregar cofrinhos.';
      },
      complete: () => {
        this.isLoadingList = false;
      }
    });
  }

  openCreate(): void {
    this.clearMessages();
    this.isCreateOpen = true;
    this.createForm.reset({ name: '', targetAmount: null });
  }

  selectPreset(preset: { label: string; image: string }): void {
    this.createForm.get('name')?.setValue(preset.label);
    this.selectedPresetImage = preset.image;
  }

  submitCreate(): void {
    if (this.createForm.invalid || !this.customerId) return;
    const { name, targetAmount } = this.createForm.value;
    // Salva imagem associada ao nome no localStorage
    if (this.selectedPresetImage && name) {
      const piggyImages = JSON.parse(localStorage.getItem('piggyImages') || '{}');
      piggyImages[name] = this.selectedPresetImage;
      localStorage.setItem('piggyImages', JSON.stringify(piggyImages));
    }
    this.isLoadingList = true;
    this.piggyBankApi.createPiggyBank({
      customerId: this.customerId,
      name,
      targetAmount
    }).subscribe({
      next: () => {
        this.successMessage = 'Cofrinho criado com sucesso!';
        this.isCreateOpen = false;
        this.selectedPresetImage = null;
        this.loadPiggyBanks();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Erro ao criar cofrinho.';
      },
      complete: () => {
        this.isLoadingList = false;
      }
    });
  }

  canDeposit(pb?: PiggyBankSummary | null): boolean {
    if (pb?.status !== 'ACTIVE') return false;
    if (this.walletBalance === null || this.walletBalance === undefined) return true;
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') return false;
    if (this.walletBalance <= 0) return false;
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
