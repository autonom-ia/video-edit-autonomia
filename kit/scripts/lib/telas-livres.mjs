// Tela livre e mídia: o assistente desenha a tela do jeito que a cena pede (HTML, CSS e GSAP)
// ou põe uma gravação de tela, um vídeo de apoio ou uma imagem. O estúdio confere o resultado,
// não a forma: arquivo dentro do projeto, animação que dá para refazer quadro a quadro,
// nada da internet na hora de montar e CSS que não vaza para o resto do vídeo (Issue #10).
import fs from 'node:fs';
import path from 'node:path';
import { MIDIA, PLUGINS_GSAP } from './regras.mjs';

// Coisas que fazem o vídeo sair diferente a cada montagem, ou travar o navegador escondido.
const NAO_DETERMINISTICO = [
  ['Math.random', 'sorteio (Math.random): o quadro muda a cada montagem'],
  ['Date.now', 'relógio (Date.now)'],
  ['new Date', 'relógio (new Date)'],
  ['performance.now', 'relógio (performance.now)'],
  ['setTimeout', 'timer (setTimeout): anime pela linha do tempo'],
  ['setInterval', 'timer (setInterval): anime pela linha do tempo'],
  ['requestAnimationFrame', 'requestAnimationFrame: anime pela linha do tempo'],
  ['fetch(', 'busca na internet (fetch)'],
  ['XMLHttpRequest', 'busca na internet (XMLHttpRequest)'],
  ['import(', 'import dinâmico'],
  ['repeat: -1', 'repetição infinita (repeat: -1): use um número'],
  ['repeat:-1', 'repetição infinita (repeat:-1): use um número'],
  ['gsap.utils.random', 'sorteio (gsap.utils.random)'],
  ['gsap.utils.shuffle', 'sorteio (gsap.utils.shuffle)'],
  ['WebSocket', 'conexão com a internet (WebSocket)'],
  ['sendBeacon', 'envio para a internet (sendBeacon)'],
  ['ws://', 'conexão com a internet (ws://)'],
  ['wss://', 'conexão com a internet (wss://)'],
];

// "Date(" sem "new" também é relógio, mas "updateDate(" é nome de função do assistente.
function chamaRelogioSolto(conteudo) {
  let i = conteudo.indexOf('Date(');
  while (i !== -1) {
    const antes = i === 0 ? '' : conteudo[i - 1];
    const ehNome = (antes >= 'a' && antes <= 'z') || (antes >= 'A' && antes <= 'Z') || (antes >= '0' && antes <= '9') || antes === '_' || antes === '$' || antes === '.';
    if (!ehNome) return true;
    i = conteudo.indexOf('Date(', i + 1);
  }
  return false;
}

// Endereço sem protocolo ("//cdn...") só conta depois de src=, href= ou url(: em comentário
// de JavaScript, "//" é comum.
const INICIOS_DE_ENDERECO = ['src="//', "src='//", 'src=//', 'href="//', "href='//", 'href=//', 'url(//', 'url("//', "url('//"];

// Endereço que pode aparecer sem ser busca na internet (o nome do formato SVG).
const ENDERECOS_PERMITIDOS = ['http://www.w3.org/', 'https://www.w3.org/'];

function enderecosExternos(conteudo) {
  const achados = [];
  const minusculo = conteudo.toLowerCase();
  for (const inicio of INICIOS_DE_ENDERECO) {
    let i = minusculo.indexOf(inicio);
    while (i !== -1) {
      let fim = i;
      while (fim < conteudo.length && !' >)'.includes(conteudo[fim])) fim += 1;
      achados.push(conteudo.slice(i, fim));
      i = minusculo.indexOf(inicio, i + inicio.length);
    }
  }
  for (const prefixo of ['http://', 'https://']) {
    let i = conteudo.indexOf(prefixo);
    while (i !== -1) {
      if (!ENDERECOS_PERMITIDOS.some((ok) => conteudo.startsWith(ok, i))) {
        let fim = i;
        while (fim < conteudo.length && !' "\'()<>'.includes(conteudo[fim])) fim += 1;
        achados.push(conteudo.slice(i, fim));
      }
      i = conteudo.indexOf(prefixo, i + prefixo.length);
    }
  }
  return achados;
}

// Conteúdo de cada <style> do fragmento.
export function blocosDeEstilo(html) {
  const blocos = [];
  const minusculo = html.toLowerCase();
  let i = minusculo.indexOf('<style');
  while (i !== -1) {
    const abre = html.indexOf('>', i);
    const fecha = minusculo.indexOf('</style', abre);
    if (abre === -1 || fecha === -1) break;
    blocos.push(html.slice(abre + 1, fecha));
    i = minusculo.indexOf('<style', fecha);
  }
  return blocos;
}

function semComentariosCss(css) {
  let saida = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const fim = css.indexOf('*/', i + 2);
      i = fim === -1 ? css.length : fim + 2;
    } else {
      saida += css[i];
      i += 1;
    }
  }
  return saida;
}

// "#tela-t1 .x" é da tela t1; "#tela-t10 .x" não é.
function comecaPelaTela(sel, raiz) {
  if (!sel.startsWith(raiz)) return false;
  const depois = sel[raiz.length];
  return depois === undefined || ' .#:[>+~,'.includes(depois);
}

const PASSO_DE_KEYFRAME = (sel) => sel === 'from' || sel === 'to' || (sel.endsWith('%') && !Number.isNaN(Number(sel.slice(0, -1))));

// Seletores de CSS que não começam pela própria tela (vazam para o resto do vídeo).
export function seletoresVazados(css, idDaTela) {
  const raiz = `#tela-${idDaTela}`;
  const vazados = [];
  const limpo = semComentariosCss(css);
  let atual = '';
  for (const ch of limpo) {
    if (ch === '{') {
      const cabeca = atual.trim();
      atual = '';
      if (!cabeca || cabeca.startsWith('@')) continue;
      for (const parte of cabeca.split(',')) {
        const sel = parte.trim();
        if (!sel || PASSO_DE_KEYFRAME(sel) || comecaPelaTela(sel, raiz)) continue;
        vazados.push(sel);
      }
    } else if (ch === '}' || ch === ';') {
      atual = '';
    } else {
      atual += ch;
    }
  }
  return vazados;
}

// Caminho relativo à pasta do projeto, sem sair dela.
export function caminhoNoProjeto(pastaProjeto, relativo) {
  if (typeof relativo !== 'string' || !relativo.trim()) return null;
  if (path.isAbsolute(relativo) || relativo.split('/').includes('..') || relativo.split('\\').includes('..')) return null;
  const completo = path.resolve(pastaProjeto, relativo);
  const base = path.resolve(pastaProjeto) + path.sep;
  if (!completo.startsWith(base)) return null;
  // Atalho (link simbólico) que aponta para fora do projeto não vale.
  if (fs.existsSync(completo)) {
    const real = fs.realpathSync(completo);
    const baseReal = fs.realpathSync(pastaProjeto) + path.sep;
    if (!real.startsWith(baseReal) || fs.lstatSync(completo).isSymbolicLink()) return null;
  }
  return completo;
}

export function tipoDeMidia(arquivo) {
  const ext = path.extname(String(arquivo || '')).toLowerCase();
  if (MIDIA.video.includes(ext)) return 'video';
  if (MIDIA.imagem.includes(ext)) return 'imagem';
  return null;
}

// Plugins do GSAP citados pelo nome dentro do fragmento.
export function pluginsCitados(conteudo) {
  return PLUGINS_GSAP.filter((nome) => conteudo.includes(nome));
}

// Confere o HTML de uma tela livre. Devolve a lista de problemas (vazia = aprovado).
// entradaPropria: a tela faz a própria chegada, então precisa registrar a animação.
export function conferirFragmento(conteudo, idDaTela, { entradaPropria = false } = {}) {
  const problemas = [];
  for (const [trecho, porque] of NAO_DETERMINISTICO) {
    if (conteudo.includes(trecho)) problemas.push(`não pode usar ${porque}`);
  }
  if (!conteudo.includes('new Date') && chamaRelogioSolto(conteudo)) problemas.push('não pode usar relógio (Date())');
  const registra = conteudo.includes('__telaLivre') && (conteudo.includes(`'${idDaTela}'`) || conteudo.includes(`"${idDaTela}"`));
  if (entradaPropria && !registra) problemas.push(`com "entrada": "propria", a tela precisa registrar a animação em window.__telaLivre['${idDaTela}']; sem isso ela fica parada`);
  for (const endereco of enderecosExternos(conteudo)) {
    problemas.push(`busca coisa na internet (${endereco}): ponha o arquivo na pasta midia do projeto e use assets/midia/<nome>`);
  }
  for (const css of blocosDeEstilo(conteudo)) {
    const vazados = seletoresVazados(css, idDaTela);
    if (vazados.length) problemas.push(`CSS que vaza para o resto do vídeo: ${vazados.slice(0, 5).join(', ')}. Comece cada regra por #tela-${idDaTela}`);
  }
  if (conteudo.includes('data-start')) problemas.push('não use data-start dentro da tela livre: o tempo vem de "entra" e "sai" no cenas.json');
  return problemas;
}

// Lê e confere o arquivo de uma tela livre ou de mídia. Devolve { problemas, conteudo }.
export function lerTelaDeArquivo(tela, pastaProjeto) {
  const rel = tela.campos && tela.campos.arquivo;
  const caminho = pastaProjeto ? caminhoNoProjeto(pastaProjeto, rel) : null;
  if (!pastaProjeto) return { problemas: [], conteudo: null, caminho: null };
  if (!caminho) return { problemas: [`"arquivo" precisa ser um caminho dentro da pasta do projeto, sem atalho para fora (veio "${rel}")`], conteudo: null, caminho: null };
  if (!fs.existsSync(caminho)) return { problemas: [`o arquivo "${rel}" não existe na pasta do projeto`], conteudo: null, caminho };
  if (tela.tipo === 'midia') {
    if (!tipoDeMidia(caminho)) return { problemas: [`"${rel}" não é vídeo nem imagem que o estúdio usa`], conteudo: null, caminho };
    return { problemas: [], conteudo: null, caminho };
  }
  if (path.extname(caminho).toLowerCase() !== '.html') return { problemas: [`a tela livre precisa ser um arquivo .html (veio "${rel}")`], conteudo: null, caminho };
  const conteudo = fs.readFileSync(caminho, 'utf8');
  return { problemas: conferirFragmento(conteudo, tela.id, { entradaPropria: (tela.campos || {}).entrada === 'propria' }), conteudo, caminho };
}
