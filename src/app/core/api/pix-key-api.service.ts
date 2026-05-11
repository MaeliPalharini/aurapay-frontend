import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePixKeyRequest,
  PixKeyResponse,
} from '../../features/wallet/models/pix-key.models';

@Injectable({
  providedIn: 'root',
})
export class PixKeyApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  // POST /pix/keys — backend gera uma chave aleatória (UUID) para o customer.
  // Limite de 5 chaves por cliente (422 quando atingido).
  createPixKey(payload: CreatePixKeyRequest): Observable<PixKeyResponse> {
    return this.http.post<PixKeyResponse>(`${this.baseUrl}/pix/keys`, payload);
  }

  // GET /pix/keys?customerId=... — backend devolve as chaves do cliente
  // ordenadas da mais recente para a mais antiga.
  listPixKeys(customerId: number): Observable<PixKeyResponse[]> {
    const params = new HttpParams().set('customerId', String(customerId));
    return this.http.get<PixKeyResponse[]>(`${this.baseUrl}/pix/keys`, { params });
  }
}