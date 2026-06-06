// Enviar Pix — transferência interna entre usuários AuraPay.
// POST /pix/transfers (exige Bearer token; tratado pelo AuthInterceptor).

export interface PixTransferRequest {
  customerId: number; // pagador (cliente logado)
  destinationPixKey: string; // chave Pix de quem recebe
  amount: number; // > 0, 2 casas decimais
}

// Operação síncrona/imediata: ou retorna SUCCESS, ou erro (sem PENDING/polling).
export type PixTransferStatus = 'SUCCESS';

export interface PixTransferResponse {
  status: PixTransferStatus;
  amount: number;
  senderBalance: number; // saldo do pagador já APÓS o débito
  destinationCustomerId: number;
  destinationPixKey: string;
  createdAt: string; // ISO LocalDateTime (sem timezone)
}