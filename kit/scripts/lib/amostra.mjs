// Páginas estáticas de 1080x1920 (amostras de cor, letra e estilo, e conferência das telas).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KIT, daRaiz } from './caminhos.mjs';
import { tokensCss, fontFaces } from './marca.mjs';
import { FAIXA } from './regras.mjs';
import { posicaoDaCamera } from './composicao.mjs';
import { legendaY, corDaLegenda } from './legenda.mjs';
import { escaparHtml, preencher, palavras } from './texto.mjs';
import { fotografarHtml, lerDom } from './chrome.mjs';

const SILHUETA = `<svg class="rosto-amostra" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="1080" height="1920" fill="#8d8d8d"/>
  <circle cx="540" cy="900" r="230" fill="#6f6f6f"/>
  <path d="M120 1920 C150 1440 330 1250 540 1250 C750 1250 930 1440 960 1920 Z" fill="#6f6f6f"/>
</svg>`;

export function estiloCss(marca, caminhoDe) {
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'reel', 'estilo.tpl.css'), 'utf8');
  return preencher(molde, { FONTES: fontFaces(marca, caminhoDe), TOKENS: tokensCss(marca) });
}

const urlDeArquivo = (rel) => pathToFileURL(daRaiz(rel)).href;

export function legendaDeExemplo(texto, enfase = '') {
  const ps = palavras(texto);
  const spans = ps.map((p, k) => `<span class="w${enfase && p === enfase ? ' k' : ''}" id="w0_${k}">${escaparHtml(p)}</span>`);
  return `<div class="cap"><span class="capin">${spans.join(' ')}</span></div>`;
}

export function paginaDeAmostra({ marca, faixa = 0, tela = '', legenda = '', gancho = '', cta = '', rotulo = '', fundo = '' }) {
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'amostra.tpl.html'), 'utf8');
  const altura = FAIXA.alturaPx[faixa];
  const cor = corDaLegenda(faixa, marca);
  const imagem = fundo ? `<img class="rosto-amostra" src="${escaparHtml(pathToFileURL(fundo).href)}" alt="">` : SILHUETA;
  return preencher(molde, {
    ESTILO: estiloCss(marca, urlDeArquivo),
    CAM_Y: posicaoDaCamera(faixa),
    ESCALA: faixa === 0 ? 1.1 : 1.0,
    FUNDO: imagem,
    FAIXA_RESTO: 1920 - altura,
    FAIXA_ALTURA: altura,
    COSTURA: altura > 0 && altura < 1920 ? 1 : 0,
    GANCHO: gancho,
    TELA: tela,
    CTA: cta,
    LEGENDA_Y: legendaY(faixa),
    LEGENDA_COR: cor.texto,
    LEGENDA_SOMBRA: cor.sombra,
    LEGENDA: legenda,
    ROTULO: rotulo ? `<div class="amostra-rotulo">${escaparHtml(rotulo)}</div>` : '',
  });
}

// Grava a página num arquivo temporário e devolve o caminho.
export function gravarPagina(html) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-amostra-'));
  const arquivo = path.join(pasta, 'pagina.html');
  fs.writeFileSync(arquivo, html, 'utf8');
  return { arquivo, limpar: () => fs.rmSync(pasta, { recursive: true, force: true }) };
}

export async function fotografarPagina(html, png) {
  const pagina = gravarPagina(html);
  try {
    await fotografarHtml(pagina.arquivo, png);
  } finally {
    pagina.limpar();
  }
  return png;
}

// Lê o DOM depois das fontes carregarem e diz quais caixas estouraram.
export async function conferirEstouro(html) {
  const pagina = gravarPagina(html);
  try {
    const dom = await lerDom(pagina.arquivo);
    const marcador = 'data-estourou="';
    const i = dom.indexOf(marcador);
    if (i === -1) return [];
    const valor = dom.slice(i + marcador.length, dom.indexOf('"', i + marcador.length));
    if (!valor || valor === 'nao') return [];
    return valor.split(',').filter(Boolean);
  } finally {
    pagina.limpar();
  }
}
