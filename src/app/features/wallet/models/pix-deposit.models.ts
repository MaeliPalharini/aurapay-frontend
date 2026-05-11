export type PixPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface CreatePixPaymentRequest {
  customerId: number;
  amount: number;
  payerEmail?: string;
}

export interface CreatePixPaymentResponse {
  id: number;
  customerId: number;
  amount: number;
  status: PixPaymentStatus;
  mercadoPagoPaymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  createdAt: string;
}

export interface PixPaymentResponse extends CreatePixPaymentResponse {
  walletId: number;
  updatedAt: string;
}

export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}

export function isTerminalPixStatus(status: PixPaymentStatus): boolean {
  return (
    status === 'APPROVED' ||
    status === 'REJECTED' ||
    status === 'CANCELLED' ||
    status === 'EXPIRED'
  );
}