import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { MercadoPagoLoaderService } from '../../../../core/mercado-pago/mercado-pago-loader.service';
import { environment } from '../../../../../environments/environment';
import { CardDepositResponse } from '../../models/card-deposit.models';

type RechargeView = 'amount' | 'card' | 'processing' | 'success' | 'error';

// Dados que o CardPayment Brick devolve no onSubmit (subset que usamos).
interface BrickCardFormData {
  token: string;
  payment_method_id: string;
  installments?: number;
  transaction_amount?: number;
}

// Tipagens mínimas do SDK do MP (não há @types oficiais aqui).
interface MpBrickController {
  unmount: () => Promise<void> | void;
}
interface MpBricksBuilder {
  create: (
    brick: string,
    containerId: string,
    settings: unknown
  ) => Promise<MpBrickController>;
}
interface MpInstance {
  bricks: () => MpBricksBuilder;
}

@Component({
  selector: 'app-card-recharge',
  standalone: false,
  templateUrl: './card-recharge.html',
  styleUrls: ['./card-recharge.scss'],
})
export class CardRecharge implements OnDestroy {
  @Input() customerId: number | null = null;
  // Emite a resposta aprovada para a página da carteira atualizar saldo/cartões.
  @Output() approved = new EventEmitter<CardDepositResponse>();

  readonly containerId = 'cardPaymentBrick_container';

  view: RechargeView = 'amount';
  amount = 0;
  errorMessage = '';
  result: CardDepositResponse | null = null;

  amountForm: ReturnType<FormBuilder['group']>;

  private brickController: MpBrickController | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: CustomerApiService,
    private readonly mpLoader: MercadoPagoLoaderService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.amountForm = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnDestroy(): void {
    void this.unmountBrick();
  }

  // Sem Public Key configurada não dá pra tokenizar — desabilita a recarga.
  get publicKeyMissing(): boolean {
    return !environment.mercadoPagoPublicKey;
  }

  // Passo 1 → 2: valida o valor e monta o formulário de cartão (Brick).
  startCardStep(): void {
    if (this.amountForm.invalid) {
      this.amountForm.markAllAsTouched();
      return;
    }
    if (!this.customerId) {
      this.errorMessage = 'Usuário não autenticado. Faça login novamente.';
      this.view = 'error';
      return;
    }

    this.amount = Math.round(Number(this.amountForm.value.amount) * 100) / 100;
    this.errorMessage = '';
    this.view = 'card';
    // Garante que o container do Brick já exista no DOM antes de montar.
    this.cdr.detectChanges();

    this.mountBrick().catch((err: unknown) => {
      this.errorMessage =
        err instanceof Error ? err.message : 'Não foi possível carregar o formulário do cartão.';
      this.view = 'error';
      this.cdr.detectChanges();
    });
  }

  changeAmount(): void {
    void this.unmountBrick();
    this.errorMessage = '';
    this.view = 'amount';
    this.cdr.detectChanges();
  }

  reset(): void {
    void this.unmountBrick();
    this.result = null;
    this.errorMessage = '';
    this.amountForm.reset({ amount: null });
    this.view = 'amount';
    this.cdr.detectChanges();
  }

  private async mountBrick(): Promise<void> {
    const MercadoPago = await this.mpLoader.load();
    const mp = new MercadoPago(environment.mercadoPagoPublicKey, {
      locale: 'pt-BR',
    }) as MpInstance;

    await this.unmountBrick();

    this.brickController = await mp.bricks().create('cardPayment', this.containerId, {
      initialization: { amount: this.amount },
      customization: {
        // Recarga sem juros: trava em 1 parcela por enquanto.
        paymentMethods: { minInstallments: 1, maxInstallments: 1 },
        visual: { style: { theme: 'default' } },
      },
      callbacks: {
        onReady: () => {
          /* Brick pronto */
        },
        onError: (error: { message?: string }) => {
          this.errorMessage = error?.message || 'Erro no formulário do cartão.';
          this.cdr.detectChanges();
        },
        onSubmit: (formData: BrickCardFormData) => this.handleBrickSubmit(formData),
      },
    });
  }

  // Chamado pelo Brick ao enviar. Retorna uma Promise: resolver mantém o fluxo
  // do Brick "concluído"; rejeitar reabilita o formulário para nova tentativa.
  private handleBrickSubmit(formData: BrickCardFormData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.customerId) {
        this.errorMessage = 'Usuário não autenticado.';
        reject();
        return;
      }

      this.errorMessage = '';
      this.cdr.detectChanges();

      this.api
        .cardDeposit(this.customerId, {
          amount: Number(formData?.transaction_amount ?? this.amount),
          cardToken: formData?.token,
          paymentMethodId: formData?.payment_method_id,
          installments: Number(formData?.installments ?? 1),
        })
        .subscribe({
          next: (res) => {
            this.result = res;

            if (res.status === 'APPROVED') {
              this.view = 'success';
              this.approved.emit(res);
              void this.unmountBrick();
              resolve();
            } else if (res.status === 'PENDING') {
              this.view = 'processing';
              void this.unmountBrick();
              resolve();
            } else {
              // REJECTED → mantém o Brick montado para nova tentativa.
              this.errorMessage = this.mapStatusDetail(res.statusDetail);
              reject();
            }
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.errorMessage = this.mapHttpError(err);
            this.cdr.detectChanges();
            reject();
          },
        });
    });
  }

  private async unmountBrick(): Promise<void> {
    if (this.brickController) {
      try {
        await this.brickController.unmount();
      } catch {
        // ignora falha ao desmontar
      }
      this.brickController = null;
    }
  }

  // Mensagens amigáveis para os status_detail de recusa mais comuns do MP.
  private mapStatusDetail(detail?: string): string {
    switch (detail) {
      case 'cc_rejected_insufficient_amount':
        return 'Saldo ou limite insuficiente no cartão.';
      case 'cc_rejected_bad_filled_card_number':
        return 'Número do cartão inválido. Confira e tente de novo.';
      case 'cc_rejected_bad_filled_date':
        return 'Data de validade inválida.';
      case 'cc_rejected_bad_filled_security_code':
        return 'Código de segurança (CVV) inválido.';
      case 'cc_rejected_bad_filled_other':
        return 'Dados do cartão incorretos. Confira e tente novamente.';
      case 'cc_rejected_call_for_authorize':
        return 'Autorize o pagamento com o banco emissor e tente de novo.';
      case 'cc_rejected_card_disabled':
        return 'Cartão desabilitado. Entre em contato com o emissor.';
      case 'cc_rejected_high_risk':
        return 'Pagamento recusado por segurança. Tente outro cartão.';
      case 'cc_rejected_max_attempts':
        return 'Muitas tentativas. Tente mais tarde ou use outro cartão.';
      case 'cc_rejected_duplicated_payment':
        return 'Pagamento duplicado. Aguarde alguns instantes.';
      default:
        return 'Pagamento recusado. Tente outro cartão.';
    }
  }

  private mapHttpError(error: HttpErrorResponse): string {
    const apiMessage = (error?.error as { message?: string } | undefined)?.message;
    switch (error?.status) {
      case 0:
        return 'Sem conexão com o servidor. Verifique sua internet.';
      case 400:
        return apiMessage || 'Requisição inválida. Verifique os dados.';
      case 401:
        return 'Sessão expirada. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para esta recarga.';
      case 422:
        return apiMessage || 'Não foi possível concluir a recarga.';
      case 500:
        return apiMessage || 'Erro interno no servidor. Tente em instantes.';
      default:
        return apiMessage || 'Não foi possível concluir a recarga.';
    }
  }
}