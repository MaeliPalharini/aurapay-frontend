// Recarga da carteira via cartão de crédito (Mercado Pago — Checkout
// Transparente). O número do cartão NUNCA vai pro backend: o front tokeniza
// com o SDK do MP e envia só o token.
// Endpoint: POST /customers/{customerId}/wallet/card-deposit (Bearer JWT).

export type CardDepositStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface CardDepositRequest {
  amount: number; // valor da recarga (ex.: 50.00)
  cardToken: string; // token gerado pelo SDK do MP (nunca o número do cartão)
  paymentMethodId: string; // ex.: "visa", "master"
  installments: number; // parcelas; fixado em 1 por enquanto
}

export interface CardDepositResponse {
  status: CardDepositStatus;
  // Motivo quando REJECTED (ex.: "cc_rejected_insufficient_amount").
  statusDetail?: string;
  // Saldo da carteira após a operação (vem em APPROVED).
  balance: number;
  // Dados do cartão usado (úteis pra exibir o "último cartão" de verdade).
  last4?: string;
  brand?: string;
}