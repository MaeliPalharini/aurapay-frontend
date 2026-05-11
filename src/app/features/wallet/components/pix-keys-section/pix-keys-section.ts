import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PixKeyApiService } from '../../../../core/api/pix-key-api.service';
import { PixKeyResponse } from '../../models/pix-key.models';
import { ApiErrorResponse } from '../../models/pix-deposit.models';

@Component({
  selector: 'app-pix-keys-section',
  standalone: false,
  templateUrl: './pix-keys-section.html',
  styleUrls: ['./pix-keys-section.scss'],
})
export class PixKeysSection implements OnChanges, OnDestroy {
  readonly maxKeys = 5;

  @Input() customerId: number | null = null;

  keys: PixKeyResponse[] = [];
  isLoading = false;
  isCreating = false;
  errorMessage = '';
  copiedKeyId: number | null = null;

  private readonly destroy$ = new Subject<void>();
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly pixKeyApi: PixKeyApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && this.customerId) {
      this.loadKeys();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
      this.copiedTimer = null;
    }
  }

  get limitReached(): boolean {
    return this.keys.length >= this.maxKeys;
  }

  trackByKeyId(_: number, key: PixKeyResponse): number {
    return key.id;
  }

  createKey(): void {
    if (!this.customerId || this.isCreating || this.limitReached) return;

    this.isCreating = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.pixKeyApi
      .createPixKey({ customerId: this.customerId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.keys = [created, ...this.keys];
          this.isCreating = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapHttpErrorToMessage(error);
          this.isCreating = false;
          this.cdr.markForCheck();
        },
      });
  }

  copyKey(key: PixKeyResponse): void {
    const finish = () => {
      this.copiedKeyId = key.id;
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => {
        this.copiedKeyId = null;
        this.cdr.markForCheck();
      }, 2000);
      this.cdr.markForCheck();
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(key.keyValue)
        .then(finish)
        .catch(() => this.fallbackCopy(key.keyValue, finish));
      return;
    }
    this.fallbackCopy(key.keyValue, finish);
  }

  private loadKeys(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.pixKeyApi
      .listPixKeys(this.customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.keys = list ?? [];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.mapHttpErrorToMessage(error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
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
      case 0:
        return 'Sem conexão com o servidor. Verifique sua internet.';
      case 422:
        return apiMessage || 'Não foi possível concluir a operação.';
      case 500:
        return apiMessage || 'Erro interno no servidor. Tente novamente em instantes.';
      default:
        return apiMessage || 'Erro ao acessar as chaves Pix.';
    }
  }
}