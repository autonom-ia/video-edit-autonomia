// Amostras de 1080x1920 para o aluno escolher: 3 paletas, 3 pares de letra, ou 3 estilos do vídeo.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS, relativoARaiz, daRaiz } from '../lib/caminhos.mjs';
import { escolha } from '../lib/args.mjs';
import { lerJson } from '../lib/json.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { abrir } from '../lib/abrir.mjs';
import { abrirProjeto, lerBriefing, lerMarca } from '../lib/projeto.mjs';
import { gerarMarca, lerCatalogo } from '../lib/marca.mjs';
import { paginaDeAmostra, fotografarPagina, legendaDeExemplo } from '../lib/amostra.mjs';
import { htmlDaTela } from '../lib/telas.mjs';
import { montarGancho } from '../lib/composicao.mjs';
import { faixaNoInstante, tamanhoPorFaixa } from '../lib/cenas.mjs';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { escaparHtml, palavras } from '../lib/texto.mjs';

function briefingBase() {
  const b = lerBriefing(false);
  if (!b || !b.marca || !String(b.marca.nome || '').trim()) falha('BRIEFING_INCOMPLETO', { faltando: ['marca.nome'] });
  return b;
}

function marcaCom(b, mudancas) {
  const copia = JSON.parse(JSON.stringify(b));
  copia.marca = { ...copia.marca, ...mudancas, cores: { principal: '', destaque: '', papel: '', tinta: '', fundo: '' } };
  const paleta0 = lerJson(path.join(PASTAS.marca, 'escolhas', 'paleta-0.json'), null);
  return gerarMarca(copia, { paletas: lerCatalogo('paletas.json'), pares: lerCatalogo('pares-de-fonte.json'), proibidosPadrao: lerCatalogo('proibidos-padrao.json'), paleta0 }).marca;
}

function telaDeExemplo(marca, b) {
  const dor = (b.publico && b.publico.dores && b.publico.dores[0]) || 'O que mais incomoda seu cliente';
  const curto = palavras(dor).slice(0, 6).join(' ');
  return htmlDaTela({ id: 'exemplo', tipo: 'frase', campos: { texto: curto, apoio: 'Exemplo de cartão' } }, { tamanho: 'm', marca });
}

async function amostrasDePaleta(b) {
  const ids = [1, 2, 3];
  if (fs.existsSync(path.join(PASTAS.marca, 'escolhas', 'paleta-0.json'))) ids.unshift(0);
  const par = Number.isInteger(b.marca.par_de_fontes_escolhido) ? b.marca.par_de_fontes_escolhido : 1;
  const saidas = [];
  for (const id of ids) {
    const marca = marcaCom(b, { paleta_escolhida: id, par_de_fontes_escolhido: par });
    const html = paginaDeAmostra({
      marca,
      faixa: 50,
      tela: telaDeExemplo(marca, b),
      legenda: legendaDeExemplo(`Assim fica ${marca.nome}`, 'fica'),
      rotulo: id === 0 ? 'Cores do seu logo' : `Opção ${id}`,
    });
    const png = path.join(PASTAS.marca, 'escolhas', `paleta-${id}.png`);
    await fotografarPagina(html, png);
    saidas.push(png);
  }
  return saidas;
}

async function amostrasDeFonte(b) {
  const paleta = Number.isInteger(b.marca.paleta_escolhida) ? b.marca.paleta_escolhida : 1;
  const saidas = [];
  for (const id of [1, 2, 3]) {
    const marca = marcaCom(b, { paleta_escolhida: paleta, par_de_fontes_escolhido: id });
    const gancho = `<div class="gancho-titulo">${escaparHtml(marca.nome)}</div>`;
    const html = paginaDeAmostra({ marca, faixa: 0, gancho, legenda: legendaDeExemplo('Uma letra que combina', 'combina'), rotulo: `Opção ${id}` });
    const png = path.join(PASTAS.marca, 'escolhas', `fonte-${id}.png`);
    await fotografarPagina(html, png);
    saidas.push(png);
  }
  return saidas;
}

async function quadroDoBruto(projeto) {
  const origem = lerJson(projeto.arq('bruto', 'origem.json'), null);
  if (!origem) return '';
  const destino = projeto.arq('amostras', 'rosto.jpg');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const meio = Math.min(2, Math.max(0, (origem.duracao || 4) / 3));
  const r = await ffmpeg(['-y', '-ss', String(meio), '-i', daRaiz(origem.arquivo), '-frames:v', '1', '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', '-q:v', '3', destino]);
  return r.codigo === 0 && fs.existsSync(destino) ? destino : '';
}

export async function amostrasDeEstilo(projeto) {
  const marca = lerMarca();
  const cenas = lerJson(projeto.arq('cenas.json'));
  const fundo = await quadroDoBruto(projeto);
  const telas = cenas.telas || [];
  const gancho = montarGancho(cenas);
  const primeira = cenas.cenas[0] || { fala: '' };
  const legenda1 = legendaDeExemplo(palavras(primeira.fala).slice(0, 3).join(' '));
  const quadros = [
    { faixa: 0, gancho: gancho.html, tela: '', legenda: legenda1, rotulo: 'Começo do vídeo' },
  ];
  for (const t of telas.slice(0, 2)) {
    const faixa = faixaNoInstante(cenas.cenas, t.entra + 0.2);
    const cena = cenas.cenas.find((c) => c.tela === t.id) || primeira;
    quadros.push({
      faixa,
      tela: htmlDaTela(t, { tamanho: tamanhoPorFaixa(faixa), solta: faixa === 0, marca }),
      legenda: faixa === 100 ? '' : legendaDeExemplo(palavras(cena.fala).slice(0, 3).join(' ')),
      rotulo: `Tela ${t.id}`,
    });
  }
  while (quadros.length < 3) {
    const cena = cenas.cenas[Math.min(quadros.length, cenas.cenas.length - 1)] || primeira;
    quadros.push({ faixa: cena.faixa || 0, tela: '', legenda: legendaDeExemplo(palavras(cena.fala).slice(0, 3).join(' ')), rotulo: `Cena ${cena.id || ''}` });
  }
  const saidas = [];
  for (let i = 0; i < 3; i += 1) {
    const q = quadros[i];
    const png = projeto.arq('amostras', `estilo-${i + 1}.png`);
    await fotografarPagina(paginaDeAmostra({ marca, fundo, ...q }), png);
    saidas.push(png);
  }
  return { saidas, semRosto: !fundo };
}

export default async function amostras({ opcoes }) {
  const tipo = escolha(opcoes, 'tipo', ['paleta', 'fonte', 'estilo']);
  let saidas;
  const avisos = [];
  if (tipo === 'estilo') {
    const projeto = abrirProjeto(opcoes);
    const r = await amostrasDeEstilo(projeto);
    saidas = r.saidas;
    if (r.semRosto) avisos.push(aviso('AMOSTRA_SEM_ROSTO', {}));
  } else {
    const b = briefingBase();
    saidas = tipo === 'paleta' ? await amostrasDePaleta(b) : await amostrasDeFonte(b);
  }
  for (const png of saidas) abrir(png);
  const arquivos = {};
  saidas.forEach((png, i) => {
    arquivos[`amostra_${i + 1}`] = relativoARaiz(png);
  });
  return { ok: true, resumo: `Abri ${saidas.length} imagens para escolher.`, avisos, arquivos, dados: { tipo, quantas: saidas.length } };
}
