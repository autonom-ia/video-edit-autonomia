// Gera minha-marca/marca.json a partir do briefing do aluno (spec D.4).
import fs from 'node:fs';
import path from 'node:path';
import { KIT, PASTAS, relativoARaiz } from './caminhos.mjs';
import { ehCorHex } from './validar.mjs';
import { normalizarHex, distancia } from './cores.mjs';
import { aviso } from './saida.mjs';

export const PAPEIS_DE_COR = ['principal', 'destaque', 'papel', 'tinta', 'fundo'];

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Campos obrigatórios para gerar a marca (spec D.4).
export function obrigatoriosFaltando(b) {
  const faltando = [];
  if (!b || typeof b !== 'object') return ['briefing.json'];
  if (vazio(b.marca && b.marca.nome)) faltando.push('marca.nome');
  if (vazio(b.nicho && b.nicho.descricao)) faltando.push('nicho.descricao');
  if (vazio(b.publico && b.publico.quem)) faltando.push('publico.quem');
  const dores = (b.publico && Array.isArray(b.publico.dores) ? b.publico.dores : []).filter((d) => !vazio(d));
  if (dores.length < 1) faltando.push('publico.dores');
  if (vazio(b.cta && b.cta.tipo)) faltando.push('cta.tipo');
  // Com cta.por_video, a palavra e o presente saem da fala de cada vídeo (Issue #10, bug B3).
  if (b.cta && b.cta.tipo === 'comentar_palavra' && b.cta.por_video !== true) {
    if (vazio(b.cta.entrega)) faltando.push('cta.entrega');
  }
  return faltando;
}

export function provasSemOrigem(b) {
  return (Array.isArray(b && b.provas) ? b.provas : [])
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p || vazio(p.origem))
    .map(({ i }) => `provas[${i}]`);
}

export function lerCatalogo(nome) {
  return JSON.parse(fs.readFileSync(path.join(KIT, 'marca', nome), 'utf8'));
}

export function slugDeFonte(familia) {
  let s = '';
  for (const ch of String(familia || '').toLowerCase()) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) s += ch;
  }
  return s;
}

export function arquivoDeFontePropria(familia) {
  const pasta = path.join(PASTAS.marca, 'fontes', slugDeFonte(familia));
  if (!fs.existsSync(pasta)) return '';
  const ttfs = fs.readdirSync(pasta).filter((n) => n.toLowerCase().endsWith('.ttf') || n.toLowerCase().endsWith('.otf'));
  const semItalico = ttfs.filter((n) => !n.toLowerCase().includes('italic'));
  const lista = semItalico.length ? semItalico : ttfs;
  const preferido = lista.find((n) => n.includes('[')) || lista.find((n) => n.toLowerCase().includes('variable')) || lista.find((n) => n.toLowerCase().includes('bold')) || lista[0];
  return preferido ? relativoARaiz(path.join(pasta, preferido)) : '';
}

function coresDaMarca(b, paletas, paleta0) {
  const escolhida = b.marca && b.marca.paleta_escolhida;
  let base;
  if (escolhida === 0 && paleta0) base = paleta0.cores;
  else {
    const id = Number.isInteger(escolhida) && escolhida >= 1 && escolhida <= 3 ? escolhida : 1;
    base = (paletas.paletas.find((p) => p.id === id) || paletas.paletas[0]).cores;
  }
  const cores = {};
  const doAluno = (b.marca && b.marca.cores) || {};
  for (const papel of PAPEIS_DE_COR) {
    const propria = doAluno[papel];
    cores[papel] = ehCorHex(propria) ? normalizarHex(propria).toUpperCase() : String(base[papel]).toUpperCase();
  }
  return cores;
}

function fontesDaMarca(b, pares) {
  const escolhido = b.marca && b.marca.par_de_fontes_escolhido;
  if (escolhido === 'proprio') {
    const titulo = (b.marca.fontes && b.marca.fontes.titulo) || '';
    const leitura = (b.marca.fontes && b.marca.fontes.leitura) || titulo;
    const arqT = arquivoDeFontePropria(titulo);
    const arqL = arquivoDeFontePropria(leitura) || arqT;
    if (arqT) {
      return {
        titulo: { familia: titulo, arquivo: arqT, peso: 700 },
        leitura: { familia: leitura, arquivo: arqL, peso: 800 },
      };
    }
  }
  const id = Number.isInteger(escolhido) && escolhido >= 1 && escolhido <= 3 ? escolhido : 1;
  const par = pares.pares.find((p) => p.id === id) || pares.pares[0];
  return { titulo: { ...par.titulo }, leitura: { ...par.leitura } };
}

export function gerarMarca(b, { paletas, pares, proibidosPadrao, paleta0 = null }) {
  const avisos = [];
  const cores = coresDaMarca(b, paletas, paleta0);
  const proprias = Object.values(cores);
  const coresProibidas = [];
  for (const c of proibidosPadrao.cores) {
    const hex = normalizarHex(c);
    if (!hex) continue;
    if (proprias.some((p) => distancia(p, hex) < 12)) avisos.push(aviso('COR_DE_APP_FAMOSO', { cor: hex }));
    else coresProibidas.push(hex);
  }
  const limpar = (lista) => (Array.isArray(lista) ? lista.map((x) => String(x).trim()).filter(Boolean) : []);
  const marca = {
    versao: 1,
    nome: String(b.marca.nome || '').trim(),
    arroba: String(b.marca.arroba || '').trim(),
    logo: b.marca.logo || null,
    cores,
    fontes: fontesDaMarca(b, pares),
    tom: b.tom || 'calmo',
    termos_obrigatorios: Array.isArray(b.termos_obrigatorios) ? b.termos_obrigatorios.filter((t) => t && t.usar) : [],
    proibidos: {
      palavras: limpar(b.palavras_proibidas),
      marcas: [...new Set([...limpar(b.marcas_proibidas), ...limpar(proibidosPadrao.marcas)])],
      cores: coresProibidas,
    },
  };
  return { marca, avisos };
}

export function tokensCss(marca) {
  const c = marca.cores;
  return [
    `--principal: ${c.principal};`,
    `--destaque: ${c.destaque};`,
    `--papel: ${c.papel};`,
    `--tinta: ${c.tinta};`,
    `--fundo: ${c.fundo};`,
    `--fonte-titulo: "${marca.fontes.titulo.familia}", sans-serif;`,
    `--fonte-leitura: "${marca.fontes.leitura.familia}", sans-serif;`,
    `--peso-titulo: ${marca.fontes.titulo.peso};`,
    `--peso-leitura: ${marca.fontes.leitura.peso};`,
  ].join(' ');
}

// @font-face com caminho relativo à página (prefixo informado por quem chama).
export function fontFaces(marca, caminhoDe) {
  const vistos = new Set();
  const regras = [];
  for (const papel of ['titulo', 'leitura']) {
    const f = marca.fontes[papel];
    const chave = `${f.familia}|${f.arquivo}`;
    if (vistos.has(chave) || !f.arquivo) continue;
    vistos.add(chave);
    const formato = f.arquivo.toLowerCase().endsWith('.otf') ? 'opentype' : 'truetype';
    regras.push(`@font-face { font-family: "${f.familia}"; font-weight: 100 900; font-display: block; src: url("${caminhoDe(f.arquivo)}") format("${formato}"); }`);
  }
  return regras.join('\n');
}
