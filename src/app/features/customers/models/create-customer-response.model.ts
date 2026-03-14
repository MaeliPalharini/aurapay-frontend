export interface CreateCustomerResponse {
  customerId: number;
  fullName: string;
  email: string;
  documentNumber: string;
  walletId: number;
  balance: number;
  walletStatus: string;
}
