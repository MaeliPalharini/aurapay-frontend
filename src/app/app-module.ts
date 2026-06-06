import { NgModule, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt, 'pt-BR');
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { AuthInterceptor } from './core/auth/auth.interceptor';
import { App } from './app';
import { CreateCustomerPage } from './features/customers/pages/create-customer-page/create-customer-page';
import { WalletDetailsPage } from './features/wallet/pages/wallet-details-page/wallet-details-page';
import { PiggyBankPage } from './features/piggy-banks/pages/piggy-bank-page/piggy-bank-page';
import { PiggyBankDetailsPage } from './features/piggy-banks/pages/piggy-bank-details-page/piggy-bank-details-page';
import { DepositPixPage } from './features/wallet/pages/deposit-pix-page/deposit-pix-page';
import { ExtratoPage } from './features/wallet/pages/extrato-page/extrato-page';
import { CardsPage } from './features/wallet/pages/cards-page/cards-page';
import { PixKeysSection } from './features/wallet/components/pix-keys-section/pix-keys-section';
import { CardRecharge } from './features/wallet/components/card-recharge/card-recharge';

@NgModule({
  declarations: [
    App,
    CreateCustomerPage,
    WalletDetailsPage,
    PiggyBankPage,
    PiggyBankDetailsPage,
    DepositPixPage,
    ExtratoPage,
    CardsPage,
    PixKeysSection,
    CardRecharge
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ],
  bootstrap: [App]
})
export class AppModule {}
