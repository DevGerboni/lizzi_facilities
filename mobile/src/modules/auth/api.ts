import { api } from '../../lib/api';
import type { Usuario } from '../../types/mobile';

export async function loginRequest(email: string, senha: string) {
  return api<{ token: string; usuario: Usuario }>('/login.php', {
    method: 'POST',
    body: { email: email.trim(), senha },
  });
}

export async function logoutRequest(): Promise<void> {
  try {
    await api('/logout.php', { method: 'POST' });
  } catch {
    // O logout local continua mesmo se a API falhar.
  }
}
