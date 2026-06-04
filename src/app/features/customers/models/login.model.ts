export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  customerId: number;
  fullName: string;
  email: string;
  token: string; // JWT — guardar e enviar como Bearer
}
