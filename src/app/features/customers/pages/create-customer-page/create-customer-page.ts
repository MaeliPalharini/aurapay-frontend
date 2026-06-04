import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerApiService } from '../../../../core/api/customer-api.service';
import { LoginResponse } from '../../models/login.model';

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
  loginPassword: string = '';
  isSubmittingLogin: boolean = false;
  loginError: string = '';

  form!: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private customerApiService: CustomerApiService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        fullName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        documentNumber: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: [CreateCustomerPage.passwordsMatch] }
    );
  }

  // Validador de grupo: senha e confirmação devem ser iguais.
  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';
    const payload = {
      fullName: this.form.value.fullName ?? '',
      email,
      documentNumber: this.form.value.documentNumber ?? '',
      password
    };

    this.customerApiService.createCustomer(payload).subscribe({
      next: (): void => {
        // O cadastro não devolve token; faz login automático com as mesmas
        // credenciais para obter o JWT e seguir autenticado.
        this.customerApiService.login({ email, password }).subscribe({
          next: (response: LoginResponse): void => {
            this.isSubmitting = false;
            this.persistUser(response);
            this.goToWallet(response.customerId);
          },
          error: (error: any): void => {
            // Conta criada, mas o login falhou: manda pra aba de login.
            this.isSubmitting = false;
            this.activeTab = 'login';
            this.loginEmail = email;
            this.loginError =
              error?.error?.message ||
              error?.message ||
              'Conta criada. Faça login para continuar.';
          }
        });
      },
      error: (error: any): void => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Não foi possível criar a conta.';
      }
    });
  }

  submitLogin(): void {
    if (!this.loginEmail?.trim() || !this.loginPassword?.trim()) {
      this.loginError = 'Preencha e-mail e senha para entrar.';
      return;
    }
    this.isSubmittingLogin = true;
    this.loginError = '';
    this.customerApiService
      .login({ email: this.loginEmail.trim(), password: this.loginPassword })
      .subscribe({
        next: (response: LoginResponse) => {
          this.isSubmittingLogin = false;
          this.persistUser(response);
          this.goToWallet(response.customerId);
        },
        error: (error: any) => {
          this.isSubmittingLogin = false;
          this.loginError =
            error?.error?.message || error?.message || 'Credenciais inválidas.';
        }
      });
  }

  // O AuthService já guardou token + customerId (aurapay_*). Aqui mantemos as
  // chaves legadas (customerId, user) que as outras páginas e a sidebar leem.
  private persistUser(response: LoginResponse): void {
    localStorage.setItem('customerId', String(response.customerId));
    localStorage.setItem(
      'user',
      JSON.stringify({
        customerId: response.customerId,
        fullName: response.fullName,
        email: response.email
      })
    );
  }

  private goToWallet(customerId: number): void {
    this.router.navigate(['/wallet'], { queryParams: { customerId } });
  }
}