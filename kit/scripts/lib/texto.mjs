// Utilidades de texto sem expressão regular: slug, contagem de palavras, normalização.

const INVISIVEIS = new Set([
  0x00ad, 0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
  0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0xfeff,
]);

const ESPACOS = new Set([0x20, 0x09, 0x0a, 0x0d, 0x0b, 0x0c, 0xa0, 0x2002, 0x2003, 0x2009, 0x202f, 0x3000]);

const PONTUACAO = '.,!?;:"\'()[]{}«»“”‘’…-–—/\\*_~`|<>';

export function tirarInvisiveis(texto) {
  let saida = '';
  for (const ch of String(texto || '')) {
    if (!INVISIVEIS.has(ch.codePointAt(0))) saida += ch;
  }
  return saida;
}

export function ehEspaco(ch) {
  return ESPACOS.has(ch.codePointAt(0));
}

export function palavras(texto) {
  const lista = [];
  let atual = '';
  for (const ch of tirarInvisiveis(texto)) {
    if (ehEspaco(ch)) {
      if (atual) lista.push(atual);
      atual = '';
    } else {
      atual += ch;
    }
  }
  if (atual) lista.push(atual);
  return lista;
}

export function contarPalavras(texto) {
  return palavras(texto).length;
}

export function semAcento(texto) {
  let saida = '';
  for (const ch of String(texto || '').normalize('NFD')) {
    const c = ch.codePointAt(0);
    if (c >= 0x300 && c <= 0x36f) continue;
    saida += ch;
  }
  return saida;
}

// Para comparar palavras: minúsculas, sem acento, sem pontuação, espaços únicos.
export function normalizar(texto) {
  let saida = '';
  for (const ch of semAcento(tirarInvisiveis(texto)).toLowerCase()) {
    if (PONTUACAO.includes(ch)) saida += ' ';
    else if (ehEspaco(ch)) saida += ' ';
    else saida += ch;
  }
  return palavras(saida).join(' ');
}

export function slug(texto, max = 40) {
  let saida = '';
  let ultimoTraco = true;
  for (const ch of semAcento(tirarInvisiveis(texto)).toLowerCase()) {
    const ok = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (ok) {
      saida += ch;
      ultimoTraco = false;
    } else if (!ultimoTraco) {
      saida += '-';
      ultimoTraco = true;
    }
  }
  while (saida.endsWith('-')) saida = saida.slice(0, -1);
  if (saida.length > max) {
    saida = saida.slice(0, max);
    while (saida.endsWith('-')) saida = saida.slice(0, -1);
  }
  return saida || 'video';
}

export function terminaComPontuacao(palavra, lista = '.,!?;:') {
  const t = String(palavra || '').trimEnd();
  if (!t) return false;
  return lista.includes(t[t.length - 1]);
}

export function pontuacaoFinal(palavra, lista = '.,!?;:…') {
  const t = String(palavra || '');
  let fim = '';
  for (let i = t.length - 1; i >= 0; i -= 1) {
    if (lista.includes(t[i])) fim = t[i] + fim;
    else break;
  }
  return fim;
}

export function ehLetra(ch) {
  if (!ch) return false;
  const base = semAcento(ch).toLowerCase();
  return (base >= 'a' && base <= 'z') || (base >= '0' && base <= '9');
}

// Procura um termo inteiro (não pedaço de palavra) num texto já normalizado.
export function contemTermo(textoNormalizado, termo) {
  const alvo = normalizar(termo);
  if (!alvo) return false;
  let inicio = 0;
  for (;;) {
    const i = textoNormalizado.indexOf(alvo, inicio);
    if (i === -1) return false;
    const antes = i === 0 ? '' : textoNormalizado[i - 1];
    const depois = textoNormalizado[i + alvo.length] || '';
    if (!ehLetra(antes) && !ehLetra(depois)) return true;
    inicio = i + 1;
  }
}

export function escaparHtml(texto) {
  let saida = '';
  for (const ch of String(texto === undefined || texto === null ? '' : texto)) {
    if (ch === '&') saida += '&amp;';
    else if (ch === '<') saida += '&lt;';
    else if (ch === '>') saida += '&gt;';
    else if (ch === '"') saida += '&quot;';
    else if (ch === "'") saida += '&#39;';
    else saida += ch;
  }
  return saida;
}

export function preencher(molde, trocas) {
  let saida = molde;
  for (const [chave, valor] of Object.entries(trocas)) {
    saida = saida.split(`{{${chave}}}`).join(String(valor));
  }
  return saida;
}

export function linhas(texto) {
  return String(texto || '').split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

export function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function arred(n, casas = 3) {
  const f = 10 ** casas;
  return Math.round(Number(n) * f) / f;
}
