import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  errorMessage: string = '';

  activeTab: 'cadastro' | 'login' = 'cadastro';

  loginEmail: string = '';
  loginDoc: string = '';
  isSubmittingLogin: boolean = false;
  loginError: string = '';

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private customerApiService: CustomerApiService,
    private router: Router
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
    this.errorMessage = '';

    const payload = {
      fullName: this.form.value.fullName ?? '',
      email: this.form.value.email ?? '',
      documentNumber: this.form.value.documentNumber ?? ''
    };

    console.log('Payload enviado:', payload);

    this.customerApiService.createCustomer(payload).subscribe({
      next: (response: CreateCustomerResponse): void => {
        this.isSubmitting = false;
        // Salva dados do usuário no localStorage
        localStorage.setItem('customerId', response.customerId.toString());
        localStorage.setItem('user', JSON.stringify({
          customerId: response.customerId,
          fullName: payload.fullName,
          email: payload.email
        }));
        this.router.navigate(['/wallet'], {
          queryParams: { customerId: response.customerId }
        });
      },
      error: (error: any): void => {
        this.isSubmitting = false;
        console.error('Erro ao criar conta:', error);
        console.error('Body do erro:', error?.error);

        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível criar a conta.';
      }
    });
  }

  submitLogin(): void {
    if (!this.loginEmail?.trim() || !this.loginDoc?.trim()) {
      this.loginError = 'Preencha e-mail e CPF para entrar.';
      return;
    }
    this.isSubmittingLogin = true;
    this.loginError = '';
    this.customerApiService.login(this.loginEmail, this.loginDoc).subscribe({
      next: (response: { customerId: number, fullName: string, email: string }) => {
        this.isSubmittingLogin = false;
        // Salva dados do usuário logado no localStorage
        localStorage.setItem('customerId', response.customerId.toString());
        localStorage.setItem('user', JSON.stringify(response));
        this.router.navigate(['/wallet'], {
          queryParams: { customerId: response.customerId }
        });
      },
      error: (error: any) => {
        this.isSubmittingLogin = false;
        this.loginError = error?.error?.message || error?.message || 'Não foi possível fazer login.';
      }
    });
  }
}
