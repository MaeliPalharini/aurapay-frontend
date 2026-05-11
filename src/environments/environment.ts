export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  // Backend roda em modo MOCK (mercado-pago.mock=true). Nesse modo, o status
  // do Pix só muda via POST /pix/payments/{id}/simulate-approval (ou webhook).
  // Em produção real, troque para `false` — o botão "Já paguei" passa a
  // apenas reconsultar o status (GET) e a aprovação vem pelo webhook do MP.
  pixMockMode: true,
};
