// Área protegida (sandbox) do programa do aluno. Dentro dela o navegador escondido não abre:
// o Chrome tem a própria proteção e o macOS não deixa uma rodar dentro da outra.
// No teste de 12/11/2026 o Codex deu só "o navegador não abriu", e ninguém soube o que fazer (Issue #8).
// Só classifica uma falha que já aconteceu. Não bloqueia antes de tentar: se a variável do Codex
// sobreviver a um comando que ele rodou fora da área, o navegador abre e nada muda.

// O Codex marca os comandos que roda dentro da área com esta variável.
export function emAreaProtegida(env = process.env) {
  return Boolean(env.CODEX_SANDBOX);
}

// Rastro que o Chrome deixa quando a proteção do macOS o impede de abrir.
export function erroDeAreaProtegida(texto) {
  return String(texto || '').includes('sandbox_parameters_mac');
}

export function codigoDoNavegador(texto, env = process.env) {
  return emAreaProtegida(env) || erroDeAreaProtegida(texto) ? 'AREA_PROTEGIDA' : 'CHROME_NAO_ABRIU';
}
