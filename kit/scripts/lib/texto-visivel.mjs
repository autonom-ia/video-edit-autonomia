// O texto que aparece na tela, tirado do HTML: sem tags, sem <style>, sem <script> e sem comentários.
// A checagem de palavra proibida olha só isto. O CSS tem "100%" de largura, e isso não é texto
// do vídeo (bug do teste de 12/11/2026, Issue #10).

const BLOCOS_INVISIVEIS = ['style', 'script', 'template', 'noscript'];

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// Código de caractere fora da faixa válida vira espaço, em vez de derrubar a checagem.
function caractere(codigo) {
  return Number.isInteger(codigo) && codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : ' ';
}

// Tags que não quebram a palavra na tela: "Sp<b>o</b>tify" aparece como "Spotify".
const EM_LINHA = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'tspan', 'textpath']);

// "<" só abre tag quando vem seguido de letra, "/", "!" ou "?". Senão é texto ("preço < 10").
function abreTag(fonte, i) {
  const c = (fonte[i + 1] || '').toLowerCase();
  return (c >= 'a' && c <= 'z') || c === '/' || c === '!' || c === '?';
}

function decodificar(texto) {
  let saida = '';
  let i = 0;
  while (i < texto.length) {
    const ch = texto[i];
    const fim = ch === '&' ? texto.indexOf(';', i) : -1;
    if (fim === -1 || fim - i > 10) {
      saida += ch;
      i += 1;
      continue;
    }
    const nome = texto.slice(i + 1, fim);
    let trocado = null;
    if (ENTIDADES[nome] !== undefined) trocado = ENTIDADES[nome];
    else if (nome.startsWith('#x') || nome.startsWith('#X')) trocado = caractere(parseInt(nome.slice(2), 16));
    else if (nome.startsWith('#')) trocado = caractere(Number(nome.slice(1)));
    if (trocado === null) {
      saida += ch;
      i += 1;
    } else {
      saida += trocado;
      i = fim + 1;
    }
  }
  return saida;
}

// Nome da tag logo depois de "<" (ou "</"), em minúsculas.
function nomeDaTag(html, inicio) {
  let i = inicio;
  if (html[i] === '/') i += 1;
  let nome = '';
  while (i < html.length) {
    const c = html[i].toLowerCase();
    if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c === '-') nome += c;
    else break;
    i += 1;
  }
  return nome;
}

export function textoVisivel(html) {
  const fonte = String(html || '');
  const minusculo = fonte.toLowerCase();
  let saida = '';
  let i = 0;
  while (i < fonte.length) {
    if (fonte.startsWith('<!--', i)) {
      const fim = fonte.indexOf('-->', i + 4);
      i = fim === -1 ? fonte.length : fim + 3;
      continue;
    }
    if (fonte[i] !== '<' || !abreTag(fonte, i)) {
      let fim = i + 1;
      while (fim < fonte.length && !(fonte[fim] === '<' && abreTag(fonte, fim))) fim += 1;
      saida += fonte.slice(i, fim);
      i = fim;
      continue;
    }
    const nome = nomeDaTag(fonte, i + 1);
    const fimDaTag = fonte.indexOf('>', i + 1);
    if (fimDaTag === -1) break;
    if (BLOCOS_INVISIVEIS.includes(nome) && fonte[i + 1] !== '/') {
      const fechamento = minusculo.indexOf(`</${nome}`, fimDaTag + 1);
      if (fechamento === -1) break;
      const fimFechamento = fonte.indexOf('>', fechamento);
      i = fimFechamento === -1 ? fonte.length : fimFechamento + 1;
      continue;
    }
    if (!EM_LINHA.has(nome)) saida += ' ';
    i = fimDaTag + 1;
  }
  return juntarEspacos(decodificar(saida));
}

function juntarEspacos(texto) {
  let saida = '';
  let espaco = false;
  for (const ch of texto) {
    if (ch.trim() === '') {
      espaco = saida.length > 0;
      continue;
    }
    if (espaco) saida += ' ';
    saida += ch;
    espaco = false;
  }
  return saida;
}

// Textos entre aspas de um script (o que o TextPlugin, o ScrambleText ou o próprio código
// escrevem na tela). Comentários ficam de fora. Texto sem nenhuma letra ("100%", "#fff",
// "0.5s") é valor de estilo, não palavra na tela.
export function textosDeScript(js) {
  const fonte = String(js || '');
  const textos = [];
  let i = 0;
  while (i < fonte.length) {
    const ch = fonte[i];
    if (ch === '/' && fonte[i + 1] === '/') {
      const fim = fonte.indexOf('\n', i);
      i = fim === -1 ? fonte.length : fim;
      continue;
    }
    if (ch === '/' && fonte[i + 1] === '*') {
      const fim = fonte.indexOf('*/', i + 2);
      i = fim === -1 ? fonte.length : fim + 2;
      continue;
    }
    if (ch !== "'" && ch !== '"' && ch !== '`') {
      i += 1;
      continue;
    }
    let atual = '';
    let j = i + 1;
    while (j < fonte.length && fonte[j] !== ch) {
      if (fonte[j] === '\\' && j + 1 < fonte.length) {
        atual += fonte[j + 1];
        j += 2;
      } else {
        atual += fonte[j];
        j += 1;
      }
    }
    if (temLetra(atual)) textos.push(atual);
    i = j + 1;
  }
  return textos;
}

function temLetra(texto) {
  for (const ch of texto) if (ch.toLowerCase() !== ch.toUpperCase()) return true;
  return false;
}

// Valores de "content:" no CSS (texto que aparece por pseudo-elemento).
export function textosDeContentCss(css) {
  const fonte = String(css || '');
  const textos = [];
  let i = fonte.indexOf('content');
  while (i !== -1) {
    let j = i + 'content'.length;
    while (j < fonte.length && fonte[j].trim() === '') j += 1;
    if (fonte[j] === ':') {
      const fim = [';', '}'].map((c) => fonte.indexOf(c, j)).filter((n) => n !== -1);
      const ate = fim.length ? Math.min(...fim) : fonte.length;
      textos.push(...textosDeScript(fonte.slice(j + 1, ate)));
    }
    i = fonte.indexOf('content', i + 1);
  }
  return textos;
}

// Conteúdo de cada bloco <tag>...</tag> (style ou script) do HTML.
export function blocosDaTag(html, tag) {
  const fonte = String(html || '');
  const minusculo = fonte.toLowerCase();
  const blocos = [];
  let i = minusculo.indexOf(`<${tag}`);
  while (i !== -1) {
    const abre = fonte.indexOf('>', i);
    const fecha = minusculo.indexOf(`</${tag}`, abre);
    if (abre === -1 || fecha === -1) break;
    blocos.push(fonte.slice(abre + 1, fecha));
    i = minusculo.indexOf(`<${tag}`, fecha);
  }
  return blocos;
}
