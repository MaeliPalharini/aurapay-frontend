export type PiggyBankStatus = 'ACTIVE' | 'CLOSED';

export interface PiggyBankSummary {
  id: number;
  /** Backend retorna customerId no create; na listagem pode ou não vir. */
  customerId?: number;
  name: string;
  targetAmount?: number | null;
  currentAmount: number;
  status: PiggyBankStatus;
  createdAt?: string;
}

export interface ListPiggyBanksResponse {
  piggyBanks: PiggyBankSummary[];
}

export interface CreatePiggyBankRequest {
  customerId: number;
  name: string;
  targetAmount?: number | null;
}

export interface CreatePiggyBankResponse extends PiggyBankSummary {
  customerId: number;
}

export type PiggyBankTransactionStatus = 'SUCCESS' | 'FAILED';

export interface DepositToPiggyBankRequest {
  customerId: number;
  amount: number;
}

export interface DepositToPiggyBankResponse {
  status: PiggyBankTransactionStatus;
  name: string;
  currentAmount: number;
  piggyBankId: string;
  piggyBankStatus: PiggyBankStatus;
  createdAt: string;
  updatedAt: string;
  transactionId: string;
}

export interface WithdrawFromPiggyBankRequest {
  customerId: number;
  amount: number;
}

export interface WithdrawFromPiggyBankResponse {
  status: PiggyBankTransactionStatus;
  name: string;
  currentAmount: number;
  piggyBankId: number;
  piggyBankStatus: PiggyBankStatus;
  createdAt: string;
  updatedAt: string;
  transactionId: number;
}

export interface PiggyBankYieldItem {
  yieldDate: string;
  yieldAmount: number;
  createdAt: string;
}

export interface PiggyBankYieldHistoryResponse {
  piggyBankId: number;
  yields: PiggyBankYieldItem[];
}
