import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  ExtratoResponse,
  ExtratoTransaction,
  ExtratoTransactionType,
} from '../../models/extrato.model';

// Ícone por tipo de movimentação (o sinal/cor NÃO sai daqui — vem do direction).
const ICON_POR_TIPO: Record<ExtratoTransactionType, string> = {
  DEPOSIT: '💵',
  PIX_RECEIVED: '⚡',
  PIGGY_BANK_DEPOSIT: '🐷',
  PIGGY_BANK_WITHDRAW: '🏦',
};

@Component({
  selector: 'app-extrato-page',
  standalone: false,
  templateUrl: './extrato-page.html',
  styleUrls: ['./extrato-page.scss'],
})
export class ExtratoPage implements OnInit {
  extrato: ExtratoResponse | null = null;
  isLoading = true;
  errorMessage = '';

  private customerId: number | null = null;

  constructor(
    private readonly customerApiService: CustomerApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // O extrato depende do token; sem sessão válida, manda pro login.
    this.customerId = this.auth.getCustomerId();
    if (!this.auth.isAuthenticated() || !this.customerId) {
      this.router.navigate(['/customers/new']);
      return;
    }
    this.loadExtrato();
  }

  loadExtrato(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.customerApiService
      .getExtrato(this.customerId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.extrato = response;
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          // 401/403 já foram tratados pelo AuthInterceptor (logout + redirect).
          // Aqui só evitamos mostrar a mensagem genérica nesse caso.
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            return;
          }
          this.errorMessage = 'Não foi possível carregar o extrato';
          this.cdr.markForCheck();
        },
      });
  }

  trackByTransactionId(_index: number, tx: ExtratoTransaction): string {
    return tx.id;
  }

  iconePorTipo(type: ExtratoTransactionType): string {
    return ICON_POR_TIPO[type] ?? '💳';
  }

  // R$ 1.234,56
  formatBRL(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor ?? 0);
  }

  // Valor com sinal a partir do direction: "+ R$ 100,00" / "- R$ 100,00".
  formatAmount(tx: ExtratoTransaction): string {
    const sinal = tx.direction === 'CREDIT' ? '+' : '-';
    return `${sinal} ${this.formatBRL(tx.amount)}`;
  }

  // createdAt vem sem timezone → o Date é interpretado como horário local,
  // então não há diferença de fuso. Ex.: 04/06/2026 14:30.
  formatData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}