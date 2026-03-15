import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { GetWalletResponse } from '../../../customers/models/get-wallet-response.model';

@Component({
  selector: 'app-wallet-details-page',
  standalone: false,
  templateUrl: './wallet-details-page.html',
  styleUrl: './wallet-details-page.scss',
})
export class WalletDetailsPage implements OnInit {
  wallet: GetWalletResponse | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  customerId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private customerApiService: CustomerApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const customerIdParam = params['customerId'];

      if (!customerIdParam) {
        this.errorMessage = 'Cliente não informado para consulta da carteira.';
        return;
      }

      const parsedCustomerId = Number(customerIdParam);

      if (Number.isNaN(parsedCustomerId)) {
        this.errorMessage = 'ID do cliente inválido.';
        return;
      }

      this.customerId = parsedCustomerId;
      this.loadWallet(parsedCustomerId);
    });
  }

  private loadWallet(customerId: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.wallet = null;

    this.customerApiService.getWalletByCustomerId(customerId).subscribe({
      next: (response: GetWalletResponse): void => {
        this.wallet = response;
        this.isLoading = false;
      },
      error: (error: any): void => {
        this.isLoading = false;
        console.error('Erro ao consultar carteira:', error);

        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível consultar a carteira.';
      }
    });
  }
}
