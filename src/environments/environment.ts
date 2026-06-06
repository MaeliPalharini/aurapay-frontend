export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  // Public Key de TESTE do Mercado Pago (painel → Suas integrações →
  // Credenciais de teste → "Public key", começa com TEST-...). NÃO é o
  // access token. Usada só para tokenizar o cartão no front (Checkout
  // Transparente). Deixe vazia para desabilitar a recarga por cartão.
  mercadoPagoPublicKey: 'TEST-dad3893b-0d6d-48a1-8ca5-429aa0df504b',
  // Backend roda em modo MOCK (mercado-pago.mock=true). Nesse modo, o status
  // do Pix só muda via POST /pix/payments/{id}/simulate-approval (ou webhook).
  // Em produção real, troque para `false` — o botão "Já paguei" passa a
  // apenas reconsultar o status (GET) e a aprovação vem pelo webhook do MP.
  pixMockMode: true,
};
