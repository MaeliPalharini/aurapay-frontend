import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateCustomerPage } from './features/customers/pages/create-customer-page/create-customer-page';
import { WalletDetailsPage } from './features/wallet/pages/wallet-details-page/wallet-details-page';
import { PiggyBankPage } from './features/piggy-banks/pages/piggy-bank-page/piggy-bank-page';
import { PiggyBankDetailsPage } from './features/piggy-banks/pages/piggy-bank-details-page/piggy-bank-details-page';
import { DepositPixPage } from './features/wallet/pages/deposit-pix-page/deposit-pix-page';

const routes: Routes = [
  { path: '', redirectTo: 'customers/new', pathMatch: 'full' },
  { path: 'customers/new', component: CreateCustomerPage },
  { path: 'wallet', component: WalletDetailsPage },
  { path: 'pix', component: DepositPixPage },
  { path: 'cofrinhos', component: PiggyBankPage },
  { path: 'cofrinhos/:id', component: PiggyBankDetailsPage },
  { path: 'deposits/pix', redirectTo: 'pix', pathMatch: 'full' },
  { path: 'transfer', redirectTo: 'pix', pathMatch: 'full' },
  { path: 'deposit', redirectTo: 'cofrinhos', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
