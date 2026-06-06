// Modelos do Extrato da carteira (GET /customers/:id/extrato).
// A lista já vem ordenada da mais recente pra mais antiga — não reordenar.

export type ExtratoTransactionType =
  | 'DEPOSIT' // depósito recebido
  | 'PIX_RECEIVED' // Pix recebido
  | 'PIGGY_BANK_DEPOSIT' // enviou pro cofrinho
  | 'PIGGY_BANK_WITHDRAW'; // resgatou do cofrinho

// O sinal/cor do valor vem SEMPRE daqui, nunca do `type`.
export type ExtratoDirection = 'CREDIT' | 'DEBIT';

export interface ExtratoTransaction {
  id: string; // chave única (usar como trackBy/key da lista)
  type: ExtratoTransactionType;
  direction: ExtratoDirection;
  description: string; // texto já pronto pra exibir
  amount: number; // sempre positivo; o sinal vem do `direction`
  createdAt: string; // ISO LocalDateTime, sem timezone (tratar como horário local)
}

export interface ExtratoResponse {
  saldoAtual: number;
  transactions: ExtratoTransaction[];
}