import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateCustomerRequest } from '../../features/customers/models/create-customer-request.model';
import { CreateCustomerResponse } from '../../features/customers/models/create-customer-response.model';
import { GetWalletResponse } from '../../features/customers/models/get-wallet-response.model';
@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCustomer(payload: CreateCustomerRequest): Observable<CreateCustomerResponse> {
    return this.http.post<CreateCustomerResponse>(`${this.baseUrl}/customers`, payload);
  }

  getWalletByCustomerId(customerId: number): Observable<GetWalletResponse> {
    return this.http.get<GetWalletResponse>(`${this.baseUrl}/customers/${customerId}/wallet`);
  }

  depositToWallet(customerId: number, amount: number): Observable<GetWalletResponse> {
    return this.http.post<GetWalletResponse>(`${this.baseUrl}/customers/${customerId}/wallet/deposit`, { amount });
  }

  login(email: string, documentNumber?: string): Observable<{ customerId: number, fullName: string, email: string }> {
    return this.http.post<{ customerId: number, fullName: string, email: string }>(
      `${this.baseUrl}/customers/login`,
      { email, documentNumber }
    );
  }
}
