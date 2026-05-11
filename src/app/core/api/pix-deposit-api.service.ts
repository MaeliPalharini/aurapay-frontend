import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePixPaymentRequest,
  CreatePixPaymentResponse,
  PixPaymentResponse,
} from '../../features/wallet/models/pix-deposit.models';

@Injectable({
  providedIn: 'root',
})
export class PixDepositApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  // POST /pix/payments — cria uma cobrança Pix no Mercado Pago via backend.
  // Backend é público em /pix/** hoje (sem auth header).
  createPixPayment(payload: CreatePixPaymentRequest): Observable<CreatePixPaymentResponse> {
    return this.http.post<CreatePixPaymentResponse>(
      `${this.baseUrl}/pix/payments`,
      payload
    );
  }

  // GET /pix/payments/{id} — consulta status atual da cobrança.
  getPixPayment(id: number): Observable<PixPaymentResponse> {
    return this.http.get<PixPaymentResponse>(`${this.baseUrl}/pix/payments/${id}`);
  }

  // POST /pix/payments/{id}/simulate-approval — só funciona com
  // mercado-pago.mock=true no backend. Em produção retorna 422.
  simulatePixApproval(id: number): Observable<PixPaymentResponse> {
    return this.http.post<PixPaymentResponse>(
      `${this.baseUrl}/pix/payments/${id}/simulate-approval`,
      {}
    );
  }
}