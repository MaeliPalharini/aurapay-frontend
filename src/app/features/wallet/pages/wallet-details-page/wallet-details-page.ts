import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { GetWalletResponse } from '../../../customers/models/get-wallet-response.model';

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
    let customerIdParam = this.route.snapshot.queryParamMap.get('customerId');

    if (!customerIdParam) {
      customerIdParam = sessionStorage.getItem('customerId');
    }

    if (!customerIdParam) {
      this.errorMessage = 'Cliente não informado para consulta da carteira.';
      this.isLoading = false;
      return;
    }

    const customerId = Number(customerIdParam);

    if (Number.isNaN(customerId) || customerId <= 0) {
      this.errorMessage = 'ID do cliente inválido.';
      this.isLoading = false;
      return;
    }

    this.customerId = customerId;
    sessionStorage.setItem('customerId', String(customerId));

    this.loadWallet();
  }

  loadWallet(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.customerApiService.getWalletByCustomerId(this.customerId).subscribe({
      next: (response: GetWalletResponse) => {
        this.wallet = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível consultar a carteira.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddFunds(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isAddFundsOpen = true;
    this.addFundsForm.reset({ amount: null });
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
      this.cdr.detectChanges();
      return;
    }

    const amount = Number(this.addFundsForm.value.amount);

    this.isSubmittingAddFunds = true;
    this.customerApiService.depositToWallet(this.customerId, amount).subscribe({
      next: () => {
        this.successMessage = 'Saldo adicionado com sucesso.';
        this.isSubmittingAddFunds = false;
        this.isAddFundsOpen = false;
        this.loadWallet();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || error?.message || 'Não foi possível adicionar saldo.';
        this.isSubmittingAddFunds = false;
        this.cdr.detectChanges();
      },
    });
  }
}
