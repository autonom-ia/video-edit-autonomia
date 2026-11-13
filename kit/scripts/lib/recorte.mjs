// Recorte da pessoa: um WebM com transparência (VP9 + alfa) por cena cujo efeito pede recorte,
// mais a foto do primeiro quadro da cena (o fundo parado, para efeitos que quebram ou trocam o fundo).
// Fica em projetos/<P>/recorte/. O manifesto guarda a assinatura do take e o trecho de cada cena:
// mudou o take ou o tempo da cena, o recorte está velho e o montar reprova.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MASTER, RECORTE } from './regras.mjs';
import { cenasComRecorte } from './efeitos.mjs';

export const MANIFESTO = 'manifesto.json';

// Tempo no quadro mais perto (30 fps): o recorte começa no mesmo quadro do take.
export function noQuadro(t) {
  return Math.round(t * MASTER.fps) / MASTER.fps;
}

// Trechos a recortar: { id, inicio, fim } no quadro, um por cena com efeito que pede recorte.
// extras: ids de cenas para recortar mesmo sem efeito (./estudio recortar --cenas c03,c05), para testar.
export function trechosDoRecorte(cenas, extras = []) {
  const ids = new Set(cenasComRecorte(cenas).map((c) => c.id));
  for (const id of extras) ids.add(id);
  return (cenas || []).filter((c) => ids.has(c.id)).map((c) => ({ id: c.id, inicio: noQuadro(c.inicio), fim: noQuadro(c.fim) }));
}

// Assinatura do take: tamanho + SHA-256 do começo, do meio e do fim (rápido mesmo em arquivo grande).
export function assinaturaDoTake(arquivo) {
  const tamanho = fs.statSync(arquivo).size;
  const bloco = 1024 * 1024;
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(arquivo, 'r');
  try {
    for (const pos of [0, Math.max(0, Math.floor(tamanho / 2) - bloco / 2), Math.max(0, tamanho - bloco)]) {
      const buf = Buffer.alloc(Math.min(bloco, tamanho));
      fs.readSync(fd, buf, 0, buf.length, pos);
      hash.update(buf);
    }
  } finally {
    fs.closeSync(fd);
  }
  return `${tamanho}:${hash.digest('hex').slice(0, 32)}`;
}

// Onde está a pessoa no primeiro quadro do recorte, em pixels do quadro (1080x1920): topo da cabeça
// e as laterais da cabeça (os 400 px de cima). alfa: bytes do canal de transparência em LARGURA x ALTURA.
export const AMOSTRA_ALFA = Object.freeze({ largura: 108, altura: 192, escala: 10, minimoNaLinha: 3 });
// Sem medida: o lugar típico de quem grava falando de perto com o celular em pé (medido em dois
// takes reais: topo da cabeça entre 740 e 880). Melhor que isto, só rodando ./estudio recortar.
export const PESSOA_PADRAO = Object.freeze({ topo: 780, esquerda: 320, direita: 800 });

export function pessoaNoAlfa(alfa) {
  const { largura, altura, escala, minimoNaLinha } = AMOSTRA_ALFA;
  const linha = (y) => {
    let esq = -1;
    let dir = -1;
    let n = 0;
    for (let x = 0; x < largura; x += 1) {
      if (alfa[y * largura + x] > 127) {
        n += 1;
        if (esq < 0) esq = x;
        dir = x;
      }
    }
    return n >= minimoNaLinha ? { esq, dir } : null;
  };
  let topo = -1;
  for (let y = 0; y < altura && topo < 0; y += 1) if (linha(y)) topo = y;
  if (topo < 0) return { ...PESSOA_PADRAO };
  let esquerda = largura;
  let direita = 0;
  const fimCabeca = Math.min(altura, topo + Math.round(400 / escala));
  for (let y = topo; y < fimCabeca; y += 1) {
    const l = linha(y);
    if (!l) continue;
    esquerda = Math.min(esquerda, l.esq);
    direita = Math.max(direita, l.dir);
  }
  return { topo: topo * escala, esquerda: esquerda * escala, direita: (direita + 1) * escala };
}

// Cenas com efeito que não pedem recorte: só a posição da pessoa é medida (um quadro).
export function cenasSoParaMedir(cenas, trechos) {
  const recortadas = new Set(trechos.map((t) => t.id));
  return (cenas || []).filter((c) => c.efeito && !recortadas.has(c.id)).map((c) => ({ id: c.id, inicio: noQuadro(c.inicio) }));
}

// Todas as medidas válidas para este take, em ordem de tempo: [{ id, t, pessoa }].
export function medidasDaPessoa(pastaRecorte, assinatura) {
  const m = lerManifesto(pastaRecorte);
  if (m.take !== assinatura) return [];
  const lista = [];
  for (const [id, v] of Object.entries(m.trechos || {})) if (v.pessoa) lista.push({ id, t: v.inicio, pessoa: v.pessoa });
  for (const [id, v] of Object.entries(m.pessoas || {})) if (v.pessoa) lista.push({ id, t: v.inicio, pessoa: v.pessoa });
  return lista.sort((a, b) => a.t - b.t);
}

// A posição da pessoa numa cena: a medida da própria cena, senão a da cena medida mais perto no
// tempo (o mesmo take, a pessoa quase não sai do lugar), senão o lugar típico.
export function pessoaDaCena(id, t, medidas) {
  // "medida": false avisa o efeito de que é só o lugar típico (rode ./estudio recortar para medir)
  const propria = medidas.find((m) => m.id === id);
  if (propria) return { ...propria.pessoa, medida: true };
  let melhor = null;
  for (const m of medidas) if (!melhor || Math.abs(m.t - t) < Math.abs(melhor.t - t)) melhor = m;
  return melhor ? { ...melhor.pessoa, medida: true } : { ...PESSOA_PADRAO, medida: false };
}

// Quadros de vários instantes, em sequência: devolve a medida do primeiro e a trilha no tempo
// ([{ t, topo, esquerda, direita }], t em segundos desde o começo da cena), para quem se mexe.
export const PASSO_DA_TRILHA = 15;
export function pessoaComTrilha(bytes, fps = 30) {
  const tam = AMOSTRA_ALFA.largura * AMOSTRA_ALFA.altura;
  const trilha = [];
  for (let k = 0; (k + 1) * tam <= bytes.length; k += 1) {
    trilha.push({ t: Math.round(((k * PASSO_DA_TRILHA) / fps) * 1000) / 1000, ...pessoaNoAlfa(bytes.subarray(k * tam, (k + 1) * tam)) });
  }
  if (!trilha.length) return { ...PESSOA_PADRAO, trilha: [] };
  const { topo, esquerda, direita } = trilha[0];
  return { topo, esquerda, direita, trilha };
}

export function arquivosDoTrecho(pastaRecorte, id) {
  return { video: path.join(pastaRecorte, `${id}.webm`), foto: path.join(pastaRecorte, `${id}.png`), fundo: path.join(pastaRecorte, `${id}-fundo.png`) };
}

export function lerManifesto(pastaRecorte) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pastaRecorte, MANIFESTO), 'utf8'));
  } catch {
    return { take: '', trechos: {} };
  }
}

// Confere os recortes contra as cenas. Devolve { faltando: [ids], prontos: [{id, inicio, fim, video, foto}] }.
export function conferirRecortes(pastaProjeto, cenas, assinatura) {
  const pasta = path.join(pastaProjeto, RECORTE.pasta);
  const manifesto = lerManifesto(pasta);
  const faltando = [];
  const prontos = [];
  for (const t of trechosDoRecorte(cenas)) {
    const arq = arquivosDoTrecho(pasta, t.id);
    const anotado = (manifesto.trechos || {})[t.id];
    const igual = anotado && Math.abs(anotado.inicio - t.inicio) < 1e-3 && Math.abs(anotado.fim - t.fim) < 1e-3;
    if (manifesto.take !== assinatura || !igual || !fs.existsSync(arq.video) || !fs.existsSync(arq.foto) || !fs.existsSync(arq.fundo)) faltando.push(t.id);
    else prontos.push({ ...t, ...arq, pessoa: anotado.pessoa || { ...PESSOA_PADRAO } });
  }
  return { faltando, prontos };
}
