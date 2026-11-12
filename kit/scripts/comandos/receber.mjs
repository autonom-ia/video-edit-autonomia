// Acha o vídeo novo na pasta 2-videos-brutos e registra no projeto (bruto/origem.json).
// Se a pasta não tem vídeo novo, olha os vídeos que chegaram em Downloads nas últimas 24 h
// (é onde o AirDrop e o navegador salvam) e devolve a lista para o assistente oferecer.
// --trazer <nome>: copia esse vídeo de Downloads para 2-videos-brutos e segue.
// --sem-downloads: não olha Downloads.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PASTAS, relativoARaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, mudarEtapa } from '../lib/projeto.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { sondar, resumoDoVideo, ffmpeg } from '../lib/ffmpeg.mjs';
import { VIDEO } from '../lib/regras.mjs';

const ehVideo = (nome) => VIDEO.extensoes.some((ext) => nome.toLowerCase().endsWith(ext));

function jaUsados() {
  const usados = new Set();
  if (!fs.existsSync(PASTAS.projetos)) return usados;
  for (const p of fs.readdirSync(PASTAS.projetos)) {
    const origem = lerJson(path.join(PASTAS.projetos, p, 'bruto', 'origem.json'), null);
    if (origem && origem.nome) usados.add(`${origem.nome}|${origem.tamanho}`);
  }
  return usados;
}

function videosNovos() {
  if (!fs.existsSync(PASTAS.brutos)) return [];
  const usados = jaUsados();
  return fs
    .readdirSync(PASTAS.brutos)
    .filter((n) => ehVideo(n) && !n.startsWith('.'))
    .map((n) => {
      const c = path.join(PASTAS.brutos, n);
      const st = fs.statSync(c);
      return { nome: n, caminho: c, tamanho: st.size, modificado: st.mtimeMs };
    })
    .filter((v) => !usados.has(`${v.nome}|${v.tamanho}`))
    .sort((a, b) => b.modificado - a.modificado);
}

export const JANELA_DOWNLOADS_MS = 24 * 60 * 60 * 1000;

export function pastaDownloads(env = process.env) {
  return env.ESTUDIO_DOWNLOADS ? path.resolve(env.ESTUDIO_DOWNLOADS) : path.join(os.homedir(), 'Downloads');
}

// Vídeos que chegaram em Downloads dentro da janela. "Chegou" é o mais novo entre criação,
// modificação e mudança de metadados (o AirDrop pode manter a data original do vídeo).
export function videosEmDownloads({ pasta = pastaDownloads(), agora = Date.now(), janelaMs = JANELA_DOWNLOADS_MS, usados = new Set() } = {}) {
  let nomes;
  try {
    nomes = fs.readdirSync(pasta);
  } catch (erro) {
    return { videos: [], semPermissao: erro && (erro.code === 'EPERM' || erro.code === 'EACCES') };
  }
  const videos = [];
  for (const nome of nomes) {
    if (nome.startsWith('.') || !ehVideo(nome)) continue;
    let st;
    try {
      st = fs.statSync(path.join(pasta, nome));
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const chegou = Math.max(st.mtimeMs || 0, st.ctimeMs || 0, st.birthtimeMs || 0);
    if (agora - chegou > janelaMs || usados.has(`${nome}|${st.size}`)) continue;
    videos.push({ nome, caminho: path.join(pasta, nome), tamanho: st.size, chegou });
  }
  videos.sort((a, b) => b.chegou - a.chegou);
  return { videos, semPermissao: false };
}

// Pastas onde o vídeo do celular costuma chegar. Downloads sempre (AirDrop, Google Drive pelo
// navegador). No Windows também Imagens e Vídeos, onde o app Fotos grava o que importa pelo cabo,
// às vezes em subpastas por ano e mês (por isso olhamos até 2 níveis abaixo).
export function pastasDeChegada(env = process.env, plataforma = process.platform) {
  if (env.ESTUDIO_DOWNLOADS) return [{ pasta: path.resolve(env.ESTUDIO_DOWNLOADS), niveis: 0 }];
  const casa = os.homedir();
  const lista = [{ pasta: path.join(casa, 'Downloads'), niveis: 0 }];
  if (plataforma === 'win32') {
    lista.push({ pasta: path.join(casa, 'Pictures'), niveis: 2 }, { pasta: path.join(casa, 'Videos'), niveis: 2 });
  }
  return lista;
}

function subpastas(pasta, niveis) {
  const todas = [pasta];
  if (niveis <= 0) return todas;
  let nomes = [];
  try {
    nomes = fs.readdirSync(pasta, { withFileTypes: true });
  } catch {
    return todas;
  }
  for (const d of nomes) {
    if (d.isDirectory() && !d.name.startsWith('.')) todas.push(...subpastas(path.join(pasta, d.name), niveis - 1));
  }
  return todas;
}

// Junta os vídeos recentes de todas as pastas de chegada. Sem permissão só conta para Downloads.
export function videosChegados({ pastas = pastasDeChegada(), agora = Date.now(), usados = new Set() } = {}) {
  const videos = [];
  let semPermissao = false;
  pastas.forEach((item, i) => {
    for (const pasta of subpastas(item.pasta, item.niveis)) {
      const r = videosEmDownloads({ pasta, agora, usados });
      if (r.semPermissao && i === 0 && pasta === item.pasta) semPermissao = true;
      videos.push(...r.videos);
    }
  });
  videos.sort((a, b) => b.chegou - a.chegou);
  return { videos, semPermissao };
}

// Copia (não move) o vídeo de Downloads para 2-videos-brutos. Mesmo nome e tamanho: reaproveita.
export function trazerDeDownloads(nome, { origem, destino = PASTAS.brutos } = {}) {
  const base = path.basename(nome);
  let de = path.join(origem || pastaDownloads(), base);
  if (!origem && !fs.existsSync(de)) {
    const achado = videosChegados({ agora: Date.now(), usados: new Set() }).videos.find((v) => v.nome === base);
    if (achado) de = achado.caminho;
  }
  if (!fs.existsSync(de) || !ehVideo(base)) falha('SEM_VIDEO', { arquivo: base, pasta: 'Downloads' });
  fs.mkdirSync(destino, { recursive: true });
  const tamanho = fs.statSync(de).size;
  const ponto = base.lastIndexOf('.');
  const raiz = ponto > 0 ? base.slice(0, ponto) : base;
  const ext = ponto > 0 ? base.slice(ponto) : '';
  for (let n = 1; n < 100; n += 1) {
    const alvo = path.join(destino, n === 1 ? base : `${raiz}-${n}${ext}`);
    if (!fs.existsSync(alvo)) {
      fs.copyFileSync(de, alvo);
      return alvo;
    }
    if (fs.statSync(alvo).size === tamanho) return alvo;
  }
  falha('SEM_VIDEO', { arquivo: base, pasta: '2-videos-brutos' });
  return '';
}

function ofertaDeDownloads(opcoes) {
  if (opcoes['sem-downloads'] === true) return null;
  const { videos, semPermissao } = videosChegados({ usados: jaUsados() });
  if (semPermissao) return { avisos: [aviso('DOWNLOADS_SEM_PERMISSAO', {})], videos: [] };
  if (!videos.length) return null;
  return {
    avisos: [aviso('VIDEO_EM_DOWNLOADS', { quantos: videos.length })],
    videos: videos.slice(0, 3).map((v, i) => ({
      arquivo: v.nome,
      tamanho_mb: Math.round(v.tamanho / 1024 / 1024),
      chegou: new Date(v.chegou).toISOString(),
      mais_novo: i === 0,
    })),
  };
}

export default async function receber({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  let escolhido;
  if (typeof opcoes.trazer === 'string') {
    const c = trazerDeDownloads(opcoes.trazer);
    const st = fs.statSync(c);
    escolhido = { nome: path.basename(c), caminho: c, tamanho: st.size, modificado: st.mtimeMs };
  } else if (typeof opcoes.arquivo === 'string') {
    const c = path.join(PASTAS.brutos, path.basename(opcoes.arquivo));
    if (!fs.existsSync(c)) falha('SEM_VIDEO', { arquivo: path.basename(opcoes.arquivo) });
    const st = fs.statSync(c);
    escolhido = { nome: path.basename(c), caminho: c, tamanho: st.size, modificado: st.mtimeMs };
  } else {
    const novos = videosNovos();
    if (!novos.length) {
      const oferta = ofertaDeDownloads(opcoes);
      if (oferta && oferta.videos.length) {
        return {
          ok: true,
          resumo: `A pasta 2-videos-brutos está vazia, mas achei ${oferta.videos.length} vídeo(s) que chegaram no computador nas últimas 24 horas (Downloads; no Windows também Imagens e Vídeos). Pergunte se é um deles.`,
          avisos: oferta.avisos,
          dados: { em_downloads: oferta.videos, trazer_com: '--trazer <arquivo>' },
        };
      }
      falha('SEM_VIDEO', { pasta: '2-videos-brutos', downloads_sem_permissao: Boolean(oferta && oferta.avisos.length) });
    }
    if (novos.length > 1) {
      const pasta = projeto.arq('bruto', 'candidatos');
      fs.mkdirSync(pasta, { recursive: true });
      const candidatos = [];
      for (const [i, v] of novos.entries()) {
        const mini = path.join(pasta, `${i + 1}.jpg`);
        await ffmpeg(['-y', '-ss', '1', '-i', v.caminho, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', mini]);
        const info = resumoDoVideo(await sondar(v.caminho));
        candidatos.push({ arquivo: v.nome, duracao_s: info.duracao, miniatura: fs.existsSync(mini) ? relativoARaiz(mini) : '', mais_novo: i === 0 });
      }
      return {
        ok: true,
        resumo: `Achei ${novos.length} vídeos novos. Pergunte qual é o de hoje.`,
        arquivos: { candidatos: relativoARaiz(pasta) },
        dados: { candidatos },
      };
    }
    [escolhido] = novos;
  }
  const info = resumoDoVideo(await sondar(escolhido.caminho));
  const origem = {
    arquivo: relativoARaiz(escolhido.caminho),
    nome: escolhido.nome,
    tamanho: escolhido.tamanho,
    modificado: new Date(escolhido.modificado).toISOString(),
    ...info,
  };
  escreverJson(projeto.arq('bruto', 'origem.json'), origem);
  mudarEtapa(projeto, 'recebido');
  const avisos = [];
  if (info.largura > info.altura) avisos.push(aviso('VIDEO_DEITADO', { largura: info.largura, altura: info.altura }));
  if (info.duracao > VIDEO.longoMaxS) avisos.push(aviso('VIDEO_LONGO', { minutos: Math.round(info.duracao / 60) }));
  if (!info.tem_audio) avisos.push(aviso('VIDEO_SEM_SOM', {}));
  return {
    ok: true,
    resumo: `Recebi o vídeo ${escolhido.nome} (${Math.round(info.duracao)} s).`,
    avisos,
    arquivos: { origem: projeto.rel('bruto', 'origem.json') },
    dados: { arquivo: escolhido.nome, duracao_s: info.duracao, hdr: info.hdr, largura: info.largura, altura: info.altura },
  };
}
