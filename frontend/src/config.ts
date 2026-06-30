// URL base da API PHP.
// ⚠️ Hoje o backend está na pasta ANINHADA no servidor (app_lizzi_fa/app_lizzi_fa).
// Quando você "achatar" a pasta para ficar só /app_lizzi_fa/, troque para:
//   'https://alexios.com.br/app_lizzi_fa'
// Em dev dá para sobrescrever com REACT_APP_API_BASE no .env.local
export const API_BASE: string =
  process.env.REACT_APP_API_BASE || 'https://alexios.com.br/app_lizzi_fa/app_lizzi_fa';

// Contato exibido na landing (CTA WhatsApp).
export const WHATSAPP_CONTATO = '5511999990000';
