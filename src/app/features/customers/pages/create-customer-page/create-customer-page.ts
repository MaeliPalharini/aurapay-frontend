import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { CreateCustomerResponse } from '../../models/create-customer-response.model';

@Component({
  selector: 'app-create-customer-page',
  templateUrl: './create-customer-page.html',
  styleUrl: './create-customer-page.scss',
  standalone: false
})
export class CreateCustomerPage {
  isSubmitting: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private customerApiService: CustomerApiService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      documentNumber: ['', [Validators.required]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      fullName: this.form.value.fullName ?? '',
      email: this.form.value.email ?? '',
      documentNumber: this.form.value.documentNumber ?? ''
    };

    this.customerApiService.createCustomer(payload).subscribe({
      next: (response: CreateCustomerResponse): void => {
        this.isSubmitting = false;
        this.successMessage = `Conta criada com sucesso! Wallet #${response.walletId}`;
        this.form.reset();
      },
      error: (error: any): void => {
        this.isSubmitting = false;
        this.errorMessage = error?.error?.message || 'Não foi possível criar a conta.';
      }
    });
  }
}
