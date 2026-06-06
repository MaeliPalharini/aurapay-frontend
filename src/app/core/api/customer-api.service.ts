import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateCustomerRequest } from '../../features/customers/models/create-customer-request.model';
import { CreateCustomerResponse } from '../../features/customers/models/create-customer-response.model';
import { GetWalletResponse } from '../../features/customers/models/get-wallet-response.model';
import { LoginRequest, LoginResponse } from '../../features/customers/models/login.model';
import { ExtratoResponse } from '../../features/wallet/models/extrato.model';
import {
  CardDepositRequest,
  CardDepositResponse,
} from '../../features/wallet/models/card-deposit.models';
import { AuthService } from '../auth/auth.service';
@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  createCustomer(payload: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.http.post<CreateCustomerResponse>(`${this.baseUrl}/customers`, payload);
  }

  getWalletByCustomerId(customerId: number): Observable<GetWalletResponse> {
    return this.http.get<GetWalletResponse>(`${this.baseUrl}/customers/${customerId}/wallet`);
  }

  depositToWallet(customerId: number, amount: number): Observable<GetWalletResponse> {
    return this.http.post<GetWalletResponse>(`${this.baseUrl}/customers/${customerId}/wallet/deposit`, { amount });
  }

  // Recarga via cartão (Mercado Pago). O Bearer JWT é injetado pelo
  // AuthInterceptor. O front envia só o token do cartão, nunca o número.
  cardDeposit(customerId: number, payload: CardDepositRequest): Observable<CardDepositResponse> {
    return this.http.post<CardDepositResponse>(
      `${this.baseUrl}/customers/${customerId}/wallet/card-deposit`,
      payload
    );
  }

  // Extrato da carteira. O AuthInterceptor injeta o Bearer token e trata
  // 401/403 (logout + volta pro login) automaticamente.
  getExtrato(customerId: number): Observable<ExtratoResponse> {
    return this.http.get<ExtratoResponse>(`${this.baseUrl}/customers/${customerId}/extrato`);
  }

  // Envia { email, password } e guarda o JWT devolvido para as próximas
  // chamadas autenticadas (ver AuthInterceptor).
  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/customers/login`, payload)
      .pipe(tap((response) => this.auth.setSession(response.token, response.customerId)));
  }
}