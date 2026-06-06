import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PixTransferRequest,
  PixTransferResponse,
} from '../../features/wallet/models/pix-transfer.models';

@Injectable({
  providedIn: 'root',
})
export class PixTransferApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  transferPix(payload: PixTransferRequest): Observable<PixTransferResponse> {
    return this.http.post<PixTransferResponse>(`${this.baseUrl}/pix/transfers`, payload);
  }
}
