import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly customerApiService: CustomerApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
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

    this.customerApiService.getWalletByCustomerId(customerId).subscribe({
      next: (response: GetWalletResponse) => {
        this.wallet = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.log('ENTROU NO ERROR', error);
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível consultar a carteira.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
      }
    });
  }
}
