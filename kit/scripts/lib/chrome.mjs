// Navegador escondido (chrome-headless-shell do HyperFrames): foto, PDF e leitura do DOM.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { EH_WINDOWS, EH_MAC, FERR } from './caminhos.mjs';
import { rodar, ultimasLinhas } from './executar.mjs';
import { caminhoDoNavegador } from './hyperframes.mjs';
import { falha } from './saida.mjs';
import { escaparHtml } from './texto.mjs';
import { codigoDoNavegador } from './area-protegida.mjs';

const NAVEGADOR = 'o navegador escondido';

const TEMPO_LIMITE = 60000;
let cacheChrome = null;

function procurarNoCache() {
  const raiz = path.join(process.env.HYPERFRAMES_CACHE_DIR || path.join(FERR, 'cache', 'hyperframes'), 'chrome');
  const nomeExe = EH_WINDOWS ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';
  const achados = [];
  const andar = (dir, nivel) => {
    if (nivel > 5 || !fs.existsSync(dir)) return;
    for (const nome of fs.readdirSync(dir)) {
      const c = path.join(dir, nome);
      let info;
      try {
        info = fs.statSync(c);
      } catch {
        continue;
      }
      if (info.isDirectory()) andar(c, nivel + 1);
      else if (nome === nomeExe) achados.push(c);
    }
  };
  andar(raiz, 0);
  andar(path.join(os.homedir(), '.cache', 'puppeteer', 'chrome-headless-shell'), 0);
  achados.sort();
  return achados[achados.length - 1] || '';
}

export async function acharChrome() {
  if (cacheChrome) return cacheChrome;
  const doEnv = process.env.HYPERFRAMES_BROWSER_PATH;
  if (doEnv && fs.existsSync(doEnv)) cacheChrome = doEnv;
  if (!cacheChrome) cacheChrome = procurarNoCache();
  if (!cacheChrome) cacheChrome = await caminhoDoNavegador();
  if (!cacheChrome) falha('CHROME_NAO_ABRIU', { detalhe: 'navegador escondido não encontrado' });
  return cacheChrome;
}

function argsBase(largura, altura) {
  const base = [
    '--headless',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=4000',
    `--window-size=${largura},${altura}`,
  ];
  if (!EH_MAC && !EH_WINDOWS) base.push('--no-sandbox');
  return base;
}

async function chamar(argumentos) {
  const exe = await acharChrome();
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-chrome-'));
  try {
    const r = await rodar(exe, [`--user-data-dir=${pasta}`, ...argumentos], { timeoutMs: TEMPO_LIMITE });
    if (r.tempoEsgotado) falha('CHROME_NAO_ABRIU', { detalhe: 'o navegador escondido demorou mais de 60 segundos' });
    return r;
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}

export async function fotografarHtml(arquivoHtml, png, { largura = 1080, altura = 1920, transparente = false } = {}) {
  fs.mkdirSync(path.dirname(png), { recursive: true });
  if (fs.existsSync(png)) fs.rmSync(png);
  const extra = transparente ? ['--default-background-color=00000000'] : [];
  const r = await chamar([...argsBase(largura, altura), ...extra, `--screenshot=${png}`, pathToFileURL(arquivoHtml).href]);
  if (!fs.existsSync(png)) falha(codigoDoNavegador(r.erro), { programa: NAVEGADOR, detalhe: ultimasLinhas(r.erro, 6) });
  return png;
}

export async function imprimirPdf(arquivoHtml, pdf) {
  fs.mkdirSync(path.dirname(pdf), { recursive: true });
  if (fs.existsSync(pdf)) fs.rmSync(pdf);
  const r = await chamar([...argsBase(1240, 1754), '--no-pdf-header-footer', '--print-to-pdf-no-header', `--print-to-pdf=${pdf}`, pathToFileURL(arquivoHtml).href]);
  if (!fs.existsSync(pdf)) falha(codigoDoNavegador(r.erro), { programa: NAVEGADOR, detalhe: ultimasLinhas(r.erro, 6) });
  return pdf;
}

export async function lerDom(arquivoHtml, { largura = 1080, altura = 1920 } = {}) {
  const r = await chamar([...argsBase(largura, altura), '--dump-dom', pathToFileURL(arquivoHtml).href]);
  if (r.codigo !== 0 && !r.saida) falha(codigoDoNavegador(r.erro), { programa: NAVEGADOR, detalhe: ultimasLinhas(r.erro, 6) });
  return r.saida;
}

// Folha de quadros: grade de imagens com o instante embaixo, numa imagem só.
export async function folhaDeQuadros(imagens, saida, { colunas = 4, rotulos = [], titulo = '' } = {}) {
  const larguraCelula = 270;
  const alturaCelula = 480;
  const linhasGrade = Math.max(1, Math.ceil(imagens.length / colunas));
  const largura = colunas * larguraCelula + (colunas + 1) * 12;
  const altura = linhasGrade * (alturaCelula + 40) + (linhasGrade + 1) * 12 + (titulo ? 60 : 0);
  const celulas = imagens
    .map((img, i) => `<figure><img src="${escaparHtml(pathToFileURL(img).href)}"><figcaption>${escaparHtml(rotulos[i] || '')}</figcaption></figure>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#1b1b1b;font:600 22px/1 Arial,sans-serif;color:#eee}
    h1{margin:0;padding:18px 12px 0;font-size:28px}
    .g{display:grid;grid-template-columns:repeat(${colunas},${larguraCelula}px);gap:12px;padding:12px}
    figure{margin:0}img{width:${larguraCelula}px;height:${alturaCelula}px;object-fit:cover;display:block;background:#333}
    figcaption{height:28px;padding-top:8px;text-align:center}
  </style></head><body>${titulo ? `<h1>${escaparHtml(titulo)}</h1>` : ''}<div class="g">${celulas}</div></body></html>`;
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-folha-'));
  const arquivo = path.join(pasta, 'folha.html');
  fs.writeFileSync(arquivo, html, 'utf8');
  const png = path.join(pasta, 'folha.png');
  try {
    await fotografarHtml(arquivo, png, { largura, altura });
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    if (saida.toLowerCase().endsWith('.png')) fs.copyFileSync(png, saida);
    else {
      const { ffmpegOk } = await import('./ffmpeg.mjs');
      await ffmpegOk(['-y', '-i', png, '-q:v', '3', saida]);
    }
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
  return saida;
}
