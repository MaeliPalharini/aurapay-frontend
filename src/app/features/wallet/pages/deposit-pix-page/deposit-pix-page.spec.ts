import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DepositPixPage } from './deposit-pix-page';

describe('DepositPixPage', () => {
  let component: DepositPixPage;
  let fixture: ComponentFixture<DepositPixPage>;

  beforeEach(async () => {
    // ngOnInit lê customerId do localStorage — garante valor válido no teste.
    localStorage.setItem('customerId', '1');

    await TestBed.configureTestingModule({
      declarations: [DepositPixPage],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositPixPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in form state', () => {
    expect(component.viewState).toBe('form');
  });

  it('should be invalid when amount is missing', () => {
    component.form.patchValue({ amount: null });
    expect(component.form.invalid).toBe(true);
  });

  it('should accept positive amount and empty payerEmail', () => {
    component.form.patchValue({ amount: 10, payerEmail: '' });
    expect(component.form.valid).toBe(true);
  });
});