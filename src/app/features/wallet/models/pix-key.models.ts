export interface CreatePixKeyRequest {
  customerId: number;
}

export interface PixKeyResponse {
  id: number;
  customerId: number;
  keyValue: string;
  createdAt: string;
}