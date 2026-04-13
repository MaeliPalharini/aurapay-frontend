import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PiggyBankApiService } from '../../../../core/api/piggy-bank-api.service';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import {
  CreatePiggyBankResponse,
  PiggyBankSummary,
} from '../../models/piggy-bank.models';

type PiggyPreset = {
  label: string;
  image: string;
};

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
  isLoadingWallet = false;

  errorMessage = '';
  successMessage = '';

  isCreateOpen = false;
  isDepositOpen = false;
  isWithdrawOpen = false;
  isDeleteOpen = false;

  walletBalance: number | null = null;
  walletStatus: string | null = null;

  selectedPresetImage: string | null = null;

  private readonly defaultPiggyImage = '/images/piggy.png';

  readonly presetOptions: ReadonlyArray<PiggyPreset> = [
    { label: 'Viagem', image: '/images/Viagem.png' },
    { label: 'Carro', image: '/images/Carro.png' },
    { label: 'Imóvel', image: '/images/Imovel.png' },
    { label: 'Lazer', image: '/images/Lazer.png' },
  ];

  createForm: ReturnType<FormBuilder['group']>;
  depositForm: ReturnType<FormBuilder['group']>;
  withdrawForm: ReturnType<FormBuilder['group']>;

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
    const customerId = this.getCustomerId();

    if (!customerId) {
      this.errorMessage = 'Usuário não autenticado. Faça login.';
      return;
    }

    this.customerId = customerId;
    this.persistCustomerId(customerId);

    this.loadWallet();
    this.loadPiggyBanks();
  }

  trackByPiggyBankId(_: number, pb: PiggyBankSummary): number {
    return pb.id;
  }

  loadWallet(): void {
    if (!this.customerId) return;

    this.isLoadingWallet = true;

    this.customerApi.getWalletByCustomerId(this.customerId).subscribe({
      next: (res) => {
        this.walletBalance = this.toNumber(res?.balance, 0);
        this.walletStatus = (res?.walletStatus as string | null) ?? null;
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

  loadPiggyBanks(): void {
    if (!this.customerId) return;

    this.isLoadingList = true;

    this.piggyBankApi.listPiggyBanks(this.customerId).subscribe({
      next: (res) => {
        this.piggyBanks = (res?.piggyBanks ?? []).map((pb) => this.normalizePiggyBank(pb));
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Erro ao carregar cofrinhos.';
      },
      complete: () => {
        this.isLoadingList = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreate(): void {
    this.clearMessages();
    this.selectedPresetImage = null;
    this.isCreateOpen = true;
    this.createForm.reset({ name: '', targetAmount: null });
  }

  openDeposit(pb: PiggyBankSummary): void {
    this.clearMessages();

    if (!this.canDeposit(pb)) {
      this.errorMessage = this.getDepositDisabledReason(pb) || 'Não é possível reservar.';
      this.cdr.detectChanges();
      return;
    }

    this.selectedPiggyBank = pb;
    this.isDepositOpen = true;
    this.depositForm.reset({ amount: null });
  }

  openWithdraw(pb: PiggyBankSummary): void {
    this.clearMessages();
    this.selectedPiggyBank = pb;
    this.isWithdrawOpen = true;
    this.withdrawForm.reset({ amount: null });
  }

  openDelete(pb: PiggyBankSummary): void {
    this.clearMessages();
    this.selectedPiggyBank = pb;
    this.isDeleteOpen = true;
  }

  closeModals(preserveMessages = false): void {
    this.isCreateOpen = false;
    this.isDepositOpen = false;
    this.isWithdrawOpen = false;
    this.isDeleteOpen = false;
    this.selectedPiggyBank = null;
    this.selectedPresetImage = null;

    this.createForm.reset({ name: '', targetAmount: null });
    this.depositForm.reset({ amount: null });
    this.withdrawForm.reset({ amount: null });

    if (!preserveMessages) {
      this.clearMessages();
    }
  }

  selectPreset(preset: { label: string; image: string }): void {
    this.createForm.get('name')?.setValue(preset.label);
    this.selectedPresetImage = preset.image;
  }

  submitCreate(): void {
    if (this.createForm.invalid || !this.customerId) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.clearMessages();

    const rawName = this.createForm.value.name;
    const rawTargetAmount = this.createForm.value.targetAmount;

    const name = String(rawName ?? '').trim();
    const targetAmount =
      rawTargetAmount === null || rawTargetAmount === undefined || rawTargetAmount === ''
        ? null
        : Number(rawTargetAmount);

    this.isLoadingList = true;

    this.piggyBankApi
      .createPiggyBank({
        customerId: this.customerId,
        name,
        targetAmount,
      })
      .subscribe({
        next: (created: CreatePiggyBankResponse) => {
          this.persistSelectedImage(created);
          this.closeModals(true);
          this.successMessage = 'Cofrinho criado com sucesso!';
          this.loadPiggyBanks();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'Erro ao criar cofrinho.';
          this.isLoadingList = false;
          this.cdr.detectChanges();
        },
      });
  }

  submitDeposit(): void {
    if (!this.customerId || !this.selectedPiggyBank) return;

    this.clearMessages();

    if (this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      this.errorMessage = 'Informe um valor válido para reserva.';
      return;
    }

    const amount = Number(this.depositForm.value.amount);

    if (this.walletBalance !== null && this.walletBalance !== undefined && amount > this.walletBalance) {
      this.errorMessage = `Saldo insuficiente na conta. Saldo atual: ${this.walletBalance.toFixed(2)}`;
      return;
    }

    this.piggyBankApi
      .deposit(this.selectedPiggyBank.id, {
        customerId: this.customerId,
        amount,
      })
      .subscribe({
        next: () => {
          this.closeModals(true);
          this.successMessage = 'Valor reservado com sucesso!';
          this.loadWallet();
          this.loadPiggyBanks();
        },
        error: (error: any) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Não foi possível reservar no cofrinho.';
          this.loadWallet();
          this.cdr.detectChanges();
        },
      });
  }

  submitWithdraw(): void {
    if (!this.customerId || !this.selectedPiggyBank) return;

    this.clearMessages();

    if (this.withdrawForm.invalid) {
      this.withdrawForm.markAllAsTouched();
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
          this.closeModals(true);
          this.successMessage = 'Resgate realizado com sucesso!';
          this.loadWallet();
          this.loadPiggyBanks();
        },
        error: (error: any) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Não foi possível resgatar do cofrinho.';
          this.loadWallet();
          this.cdr.detectChanges();
        },
      });
  }

  confirmDelete(): void {
    if (!this.customerId || !this.selectedPiggyBank?.id) return;

    this.clearMessages();
    this.isLoadingList = true;

    this.piggyBankApi.deletePiggyBank(this.customerId, this.selectedPiggyBank.id).subscribe({
      next: () => {
        this.closeModals(true);
        this.successMessage = 'Cofrinho excluído com sucesso!';
        this.loadWallet();
        this.loadPiggyBanks();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Erro ao excluir cofrinho.';
        this.isLoadingList = false;
        this.cdr.detectChanges();
      },
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
    if (this.walletBalance === null || this.walletBalance === undefined) return 'Saldo da conta indisponível.';
    if (this.walletStatus && this.walletStatus !== 'ACTIVE') {
      return `Conta indisponível (status: ${this.walletStatus}).`;
    }
    if (this.walletBalance <= 0) return 'Saldo insuficiente na conta.';
    return '';
  }

  hasTarget(pb: PiggyBankSummary): boolean {
    return pb.targetAmount !== null && pb.targetAmount !== undefined && Number(pb.targetAmount) > 0;
  }

  getProgressPercentage(pb: PiggyBankSummary): number {
    if (!this.hasTarget(pb)) return 0;

    const currentAmount = this.toNumber(pb.currentAmount, 0);
    const targetAmount = this.toNumber(pb.targetAmount, 0);

    if (targetAmount <= 0) return 0;

    return Math.min((currentAmount / targetAmount) * 100, 100);
  }

  resolvePiggyBankImage(pb: PiggyBankSummary): string {
    const savedImage = this.getSavedImage(pb);
    if (savedImage) return savedImage;

    const backendImage = this.normalizeImagePath(pb.imageUrl);
    if (backendImage) return backendImage;

    const presetImage = this.findPresetImageByName(pb.name);
    if (presetImage) return presetImage;

    return this.defaultPiggyImage;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;

    if (img.src.includes(this.defaultPiggyImage)) return;

    img.src = this.defaultPiggyImage;
  }

  private getCustomerId(): number | null {
    const rawCustomerId =
      this.route.snapshot.queryParamMap.get('customerId') ??
      sessionStorage.getItem('customerId') ??
      localStorage.getItem('customerId');

    if (!rawCustomerId) return null;

    const customerId = Number(rawCustomerId);

    if (Number.isNaN(customerId) || customerId <= 0) return null;

    return customerId;
  }

  private persistCustomerId(customerId: number): void {
    sessionStorage.setItem('customerId', String(customerId));
    localStorage.setItem('customerId', String(customerId));
  }

  private normalizePiggyBank(pb: PiggyBankSummary): PiggyBankSummary {
    return {
      ...pb,
      currentAmount: this.toNumber(pb.currentAmount, 0),
      targetAmount:
        pb.targetAmount === null || pb.targetAmount === undefined
          ? null
          : this.toNumber(pb.targetAmount, 0),
      imageUrl: this.normalizeImagePath(pb.imageUrl),
    };
  }

  private persistSelectedImage(created: CreatePiggyBankResponse): void {
    if (!this.selectedPresetImage) return;

    const storage = this.getPiggyImageStorage();
    const normalizedName = this.normalizeText(created?.name || this.createForm.value.name || '');

    if (created?.id) {
      storage[`id:${created.id}`] = this.selectedPresetImage;
    }

    if (normalizedName) {
      storage[`name:${normalizedName}`] = this.selectedPresetImage;
      storage[normalizedName] = this.selectedPresetImage;
    }

    localStorage.setItem('piggyImages', JSON.stringify(storage));
  }

  private getSavedImage(pb: PiggyBankSummary): string | null {
    const storage = this.getPiggyImageStorage();

    const byId = storage[`id:${pb.id}`];
    const byName = storage[`name:${this.normalizeText(pb.name)}`];
    const legacyByName = storage[this.normalizeText(pb.name)];

    return this.normalizeImagePath(byId || byName || legacyByName);
  }

  private getPiggyImageStorage(): Record<string, string> {
    try {
      const raw = localStorage.getItem('piggyImages');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private findPresetImageByName(name: string): string | null {
    const normalizedName = this.normalizeText(name);
    const preset = this.presetOptions.find(
      (item) => this.normalizeText(item.label) === normalizedName
    );

    return preset?.image ?? null;
  }

  private normalizeImagePath(path?: string | null): string | null {
    if (!path) return null;

    const value = String(path).trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
      return value;
    }

    if (value.startsWith('assets/images/')) {
      return `/${value.replace(/^assets\//, '')}`;
    }

    if (value.startsWith('images/')) {
      return `/${value}`;
    }

    if (/\.(png|jpe?g|webp|svg)$/i.test(value)) {
      const fileName = value.split('/').pop();
      return fileName ? `/images/${fileName}` : null;
    }

    return null;
  }

  private normalizeText(value: string): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
