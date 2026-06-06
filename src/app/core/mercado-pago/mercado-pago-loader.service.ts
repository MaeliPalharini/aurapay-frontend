import { Injectable } from '@angular/core';

// Carrega o SDK V2 do Mercado Pago uma única vez e resolve com o construtor
// global `MercadoPago`. O script também está no index.html; aqui garantimos
// que ele esteja realmente disponível antes de criar o Brick (evita race).
const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

// Tipagem mínima do construtor global — o SDK não tem tipos oficiais aqui.
type MercadoPagoConstructor = new (publicKey: string, options?: { locale?: string }) => unknown;

@Injectable({ providedIn: 'root' })
export class MercadoPagoLoaderService {
  private loadPromise: Promise<MercadoPagoConstructor> | null = null;

  load(): Promise<MercadoPagoConstructor> {
    const w = window as unknown as { MercadoPago?: MercadoPagoConstructor };
    if (w.MercadoPago) {
      return Promise.resolve(w.MercadoPago);
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<MercadoPagoConstructor>((resolve, reject) => {
      const resolveWhenReady = () => {
        if (w.MercadoPago) {
          resolve(w.MercadoPago);
        } else {
          reject(new Error('SDK do Mercado Pago carregou, mas o objeto não está disponível.'));
        }
      };
      const fail = () => reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));

      // Reaproveita o <script> do index.html, se existir.
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
      if (existing) {
        if (w.MercadoPago) {
          resolve(w.MercadoPago);
          return;
        }
        existing.addEventListener('load', resolveWhenReady);
        existing.addEventListener('error', fail);
        return;
      }

      // Caso não exista, injeta dinamicamente.
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.addEventListener('load', resolveWhenReady);
      script.addEventListener('error', fail);
      document.body.appendChild(script);
    });

    return this.loadPromise;
  }
}