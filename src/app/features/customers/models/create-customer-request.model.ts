export interface CreateCustomerRequest {
  fullName: string;
  email: string;
  documentNumber: string;
  password: string; // mínimo 6 caracteres
}
