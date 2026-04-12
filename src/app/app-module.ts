import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CreateCustomerPage } from './features/customers/pages/create-customer-page/create-customer-page';
import { WalletDetailsPage } from './features/wallet/pages/wallet-details-page/wallet-details-page';
import { PiggyBankPage } from './features/piggy-banks/pages/piggy-bank-page/piggy-bank-page';
import { PiggyBankDetailsPage } from './features/piggy-banks/pages/piggy-bank-details-page/piggy-bank-details-page';

@NgModule({
  declarations: [
    App,
    CreateCustomerPage,
    WalletDetailsPage,
    PiggyBankPage,
    PiggyBankDetailsPage
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    ReactiveFormsModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi())
  ],
  bootstrap: [App]
})
export class AppModule {}
