import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePiggyBankRequest,
  CreatePiggyBankResponse,
  DepositToPiggyBankRequest,
  DepositToPiggyBankResponse,
  ListPiggyBanksResponse,
  PiggyBankYieldHistoryResponse,
  WithdrawFromPiggyBankRequest,
  WithdrawFromPiggyBankResponse,
} from '../../features/piggy-banks/models/piggy-bank.models';

@Injectable({
  providedIn: 'root',
})
export class PiggyBankApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  createPiggyBank(payload: CreatePiggyBankRequest): Observable<CreatePiggyBankResponse> {
    return this.http.post<CreatePiggyBankResponse>(`${this.baseUrl}/cofrinhos`, payload);
  }

  listPiggyBanks(customerId: number): Observable<ListPiggyBanksResponse> {
    return this.http.get<ListPiggyBanksResponse>(`${this.baseUrl}/cofrinhos`, {
      params: { customerId: String(customerId) },
    });
  }

  deposit(piggyBankId: number, payload: DepositToPiggyBankRequest): Observable<DepositToPiggyBankResponse> {
    return this.http.post<DepositToPiggyBankResponse>(`${this.baseUrl}/cofrinhos/${piggyBankId}/deposit`, payload);
  }

  withdraw(piggyBankId: number, payload: WithdrawFromPiggyBankRequest): Observable<WithdrawFromPiggyBankResponse> {
    return this.http.post<WithdrawFromPiggyBankResponse>(`${this.baseUrl}/cofrinhos/${piggyBankId}/withdraw`, payload);
  }

  getYieldHistory(piggyBankId: number): Observable<PiggyBankYieldHistoryResponse> {
    return this.http.get<PiggyBankYieldHistoryResponse>(`${this.baseUrl}/cofrinhos/${piggyBankId}/yield`);
  }
}

