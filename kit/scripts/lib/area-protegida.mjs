// Área protegida (sandbox) do programa do aluno. Dentro dela o navegador escondido não abre:
// o Chrome tem a própria proteção e o macOS não deixa uma rodar dentro da outra.
// No teste de 12/11/2026 o Codex deu só "o navegador não abriu", e ninguém soube o que fazer (Issue #8).
import { falha } from './saida.mjs';

// O Codex marca os comandos que roda dentro da área com esta variável.
export function emAreaProtegida(env = process.env) {
  return Boolean(env.CODEX_SANDBOX);
}

// Rastro que o Chrome deixa quando a proteção do macOS o impede de abrir.
export function erroDeAreaProtegida(texto) {
  return String(texto || '').includes('sandbox_parameters_mac');
}

// Para antes de tentar: dentro da área, o navegador escondido só falharia depois de esperar.
export function exigirForaDaArea(programa, env = process.env) {
  if (emAreaProtegida(env)) falha('AREA_PROTEGIDA', { programa });
}

export function codigoDoNavegador(texto, env = process.env) {
  return emAreaProtegida(env) || erroDeAreaProtegida(texto) ? 'AREA_PROTEGIDA' : 'CHROME_NAO_ABRIU';
}
