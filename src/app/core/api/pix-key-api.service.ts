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

  createPixKey(payload: CreatePixKeyRequest): Observable<PixKeyResponse> {
    return this.http.post<PixKeyResponse>(`${this.baseUrl}/pix/keys`, payload);
  }

  listPixKeys(customerId: number): Observable<PixKeyResponse[]> {
    const params = new HttpParams().set('customerId', String(customerId));
    return this.http.get<PixKeyResponse[]>(`${this.baseUrl}/pix/keys`, { params });
  }
  deletePixKey(pixKeyId: number, customerId: number): Observable<void> {
    const params = new HttpParams().set('customerId', String(customerId));
    return this.http.delete<void>(`${this.baseUrl}/pix/keys/${pixKeyId}`, { params });
  }
}
