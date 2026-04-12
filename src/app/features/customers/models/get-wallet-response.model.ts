export type WalletStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE' | 'CLOSED' | string;

export interface GetWalletResponse {
  walletId: number;
  customerId: number;
  balance: number;
  walletStatus: WalletStatus;
  updatedAt: string;
}
