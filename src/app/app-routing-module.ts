import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateCustomerPage } from './features/customers/pages/create-customer-page/create-customer-page';
import { WalletDetailsPage } from './features/wallet/pages/wallet-details-page/wallet-details-page';

const routes: Routes = [
  { path: '', redirectTo: 'customers/new', pathMatch: 'full' },
  { path: 'customers/new', component: CreateCustomerPage },
  { path: 'wallet', component: WalletDetailsPage },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
