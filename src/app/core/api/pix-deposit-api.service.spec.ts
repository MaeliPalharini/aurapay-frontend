import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PixDepositApiService } from './pix-deposit-api.service';
import { environment } from '../../../environments/environment';

describe('PixDepositApiService', () => {
  let service: PixDepositApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PixDepositApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PixDepositApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST /pix/payments with body', () => {
    service
      .createPixPayment({ customerId: 1, amount: 25.5, payerEmail: 'a@b.com' })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/pix/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      customerId: 1,
      amount: 25.5,
      payerEmail: 'a@b.com',
    });
    req.flush({});
  });

  it('should GET /pix/payments/{id}', () => {
    service.getPixPayment(42).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pix/payments/42`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});