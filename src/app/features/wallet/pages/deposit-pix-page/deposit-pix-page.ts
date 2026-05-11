import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PixDepositApiService } from '../../../../core/api/pix-deposit-api.service';
import { environment } from '../../../../../environments/environment';
import {
  ApiErrorResponse,
  CreatePixPaymentResponse,
  PixPaymentResponse,
  PixPaymentStatus,
  isTerminalPixStatus,
} from '../../models/pix-deposit.models';

type AreaPixViewState = 'form' | 'loading' | 'qrcode' | 'success' | 'error';

@Component({
  selector: 'app-deposit-pix-page',
  standalone: false,



  templateUrl: './deposit-pix-page.html',
  styleUrls: ['./deposit-pix-page.scss'],
})
export class DepositPixPage implements OnInit, OnDestroy {
  viewState: AreaPixViewState = 'form';

  form!: ReturnType<FormBuilder['group']>;

  customerId: number | null = null;
  payment: CreatePixPaymentResponse | null = null;
  finalPayment: PixPaymentResponse | null = null;

  errorMessage = '';
  copied = false;

  remainingSeconds = 0;
  expiringSoon = false;

  // Polling 5s. Timeout total: 5 min (regra de UX combinada com o backend).
  private readonly pollIntervalMs = 5000;
  private readonly pollTimeoutMs = 5 * 60 * 1000;
  private pollStartedAt = 0;

  private readonly destroy$ = new Subject<void>();
  // Subjects separados para que parar o polling não derrube o timer regressivo
  // (e vice-versa). Antes era um Subject compartilhado e o timer morria assim
  // que o polling de status começava.
  private readonly pollStop$ = new Subject<void>();
  private readonly timerStop$ = new Subject<void>();
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly pixApi: PixDepositApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      payerEmail: [''],
    });
  }

  ngOnInit(): void {
    const customerIdStr = localStorage.getItem('customerId');
    if (!customerIdStr) {
      this.errorMessage = 'Usuário não autenticado. Faça login.';
      this.viewState = 'error';
      return;
    }
    const id = Number(customerIdStr);
    if (Number.isNaN(id) || id <= 0) {
      this.errorMessage = 'ID do cliente inválido.';
      this.viewState = 'error';
      return;
    }
    this.customerId = id;

    // Pré-preenche e-mail do pagador a partir do user salvo no login.
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as { email?: string };
        if (user?.email) {
          this.form.patchValue({ payerEmail: user.email });
        }
      } catch {
        // ignora user mal formado
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopTimer();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
      this.copiedTimer = null;
    }
  }

  submit(): void {
    if (!this.customerId) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const amount = this.normalizeAmount(this.form.value.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = 'Informe um valor válido maior que zero.';
      return;
    }

    const payerEmail = String(this.form.value.payerEmail ?? '').trim();

    this.errorMessage = '';
    this.viewState = 'loading';
    this.cdr.markForCheck();

    this.pixApi
      .createPixPayment({
        customerId: this.customerId,
        amount,
        ...(payerEmail ? { payerEmail } : {}),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.payment = response;
          this.viewState = 'qrcode';

          // Se já vier APROVADO (raro mas possível em testes), ir direto pro sucesso.
          if (isTerminalPixStatus(response.status)) {
            this.handleTerminalStatus({
              ...response,
              walletId: 0,
              updatedAt: response.createdAt,
            });
          } else {
            this.startPollingTimer();
            this.startPolling(response.id);
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapHttpErrorToMessage(error);
          this.viewState = 'error';
          this.cdr.markForCheck();
        },
      });
  }

  copyKey(): void {
    const key = this.payment?.qrCode;
    if (!key) return;

    const finish = () => {
      this.copied = true;
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2000);
      this.cdr.markForCheck();
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(key).then(finish).catch(() => this.fallbackCopy(key, finish));
      return;
    }
    this.fallbackCopy(key, finish);
  }

  // Botão "Já paguei":
  // - Em modo mock (pixMockMode=true), dispara POST /simulate-approval para
  //   forçar a aprovação no backend (que normalmente viria via webhook do MP).
  // - Em produção, faz apenas GET — o webhook real do MP é quem aprova.
  checkNow(): void {
    if (!this.payment?.id) return;

    const request$ = environment.pixMockMode
      ? this.pixApi.simulatePixApproval(this.payment.id)
      : this.pixApi.getPixPayment(this.payment.id);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          // simulate-approval já retorna um estado terminal; handleStatusUpdate
          // ignora estados não-terminais (PENDING) silenciosamente.
          if (isTerminalPixStatus(status.status)) {
            this.handleTerminalStatus(status);
          } else {
            this.handleStatusUpdate(status);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapHttpErrorToMessage(error);
          this.viewState = 'error';
          this.stopPolling();
          this.stopTimer();
          this.cdr.markForCheck();
        },
      });
  }

  retry(): void {
    this.stopPolling();
    this.stopTimer();
    this.payment = null;
    this.finalPayment = null;
    this.errorMessage = '';
    this.remainingSeconds = 0;
    this.expiringSoon = false;
    this.viewState = 'form';
    this.cdr.markForCheck();
  }

  // Helpers para o template

  formatRemaining(): string {
    const total = Math.max(0, this.remainingSeconds);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  qrCodeImageSrc(): string | null {
    const base64 = this.payment?.qrCodeBase64;
    if (!base64) return null;
    return `data:image/png;base64,${base64}`;
  }

  // Internos

  private startPolling(paymentId: number): void {
    this.stopPolling();
    this.pollStartedAt = Date.now();

    interval(this.pollIntervalMs)
      .pipe(
        switchMap(() => this.pixApi.getPixPayment(paymentId)),
        takeUntil(this.pollStop$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (status) => this.handleStatusUpdate(status),
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapHttpErrorToMessage(error);
          this.viewState = 'error';
          this.stopPolling();
          this.cdr.markForCheck();
        },
      });
  }

  private handleStatusUpdate(status: PixPaymentResponse): void {
    if (!isTerminalPixStatus(status.status)) return;
    this.handleTerminalStatus(status);
  }

  private handleTerminalStatus(status: PixPaymentResponse): void {
    this.finalPayment = status;
    this.stopPolling();
    this.stopTimer();

    if (status.status === 'APPROVED') {
      this.viewState = 'success';
    } else {
      this.errorMessage = this.mapPixStatusToMessage(status.status);
      this.viewState = 'error';
    }
    this.cdr.markForCheck();
  }

  private startPollingTimer(): void {
    const tick = () => {
      const elapsed = Date.now() - this.pollStartedAt;
      const remainingMs = Math.max(0, this.pollTimeoutMs - elapsed);
      const diffSec = Math.floor(remainingMs / 1000);
      this.remainingSeconds = diffSec;
      this.expiringSoon = diffSec > 0 && diffSec <= 60;

      if (diffSec === 0 && this.viewState === 'qrcode') {
        // Timeout local — para tudo e mostra mensagem de expiração.
        // O backend ainda pode aprovar depois (webhook), mas a UI precisa
        // de feedback claro.
        this.errorMessage = this.mapPixStatusToMessage('EXPIRED');
        this.viewState = 'error';
        this.stopPolling();
        this.stopTimer();
      }
      this.cdr.markForCheck();
    };

    this.stopTimer();
    this.pollStartedAt = Date.now();
    this.remainingSeconds = Math.floor(this.pollTimeoutMs / 1000);
    tick();
    interval(1000)
      .pipe(takeUntil(this.timerStop$), takeUntil(this.destroy$))
      .subscribe(tick);
  }

  private stopPolling(): void {
    this.pollStop$.next();
  }

  private stopTimer(): void {
    this.timerStop$.next();
  }

  private normalizeAmount(value: unknown): number {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return NaN;
    // Garante 2 casas decimais (evita 1.005, etc.).
    return Math.round(raw * 100) / 100;
  }

  private fallbackCopy(value: string, onDone: () => void): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onDone();
    } catch {
      // silencioso
    }
  }

  private mapHttpErrorToMessage(error: HttpErrorResponse): string {
    const apiBody = error?.error as ApiErrorResponse | undefined;
    const apiMessage = apiBody?.message;

    switch (error?.status) {
      case 400:
        return apiMessage || 'Requisição inválida. Verifique os dados e tente novamente.';
      case 401:
        return 'Sessão expirada ou usuário não autenticado.';
      case 403:
        return 'Você não tem permissão para realizar este depósito.';
      case 404:
        return apiMessage || 'Cobrança Pix não encontrada.';
      case 422:
        return apiMessage || 'Não foi possível processar a cobrança Pix.';
      case 429:
        return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
      case 500:
        return apiMessage || 'Erro interno no servidor. Tente novamente em instantes.';
      case 0:
        return 'Sem conexão com o servidor. Verifique sua internet.';
      default:
        return apiMessage || 'Não foi possível processar a cobrança Pix.';
    }
  }

  private mapPixStatusToMessage(status: PixPaymentStatus): string {
    switch (status) {
      case 'EXPIRED':
        return 'O QR Code expirou antes do pagamento ser concluído.';
      case 'CANCELLED':
        return 'O pagamento foi cancelado.';
      case 'REJECTED':
        return 'O pagamento foi recusado. Tente novamente.';
      default:
        return 'Não foi possível concluir o depósito.';
    }
  }
}
