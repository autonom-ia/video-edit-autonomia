// Mixagem: trilha em trechos (cheio, abafado, mudo) que respeitam as viradas do vídeo,
// ducking só pela voz, estéreo, −14 LUFS e pico ≤ −1 dBTP (spec D.6).
// Portado da mixagem que funcionou no primeiro vídeo; o grafo é texto puro para poder ser testado.
import { SOM } from './regras.mjs';
import { arred } from './texto.mjs';

const r3 = (n) => arred(n, 3);
const PRIORIDADE = { cheio: 0, abafado: 1, mudo: 2 };

// Pausas da fala (buracos entre palavras) maiores que "minimo" segundos.
export function pausasDaFala(palavras, minimo = 0.6) {
  const lista = [];
  for (let i = 1; i < palavras.length; i += 1) {
    const a = palavras[i - 1].fim;
    const b = palavras[i].inicio;
    if (b - a >= minimo) lista.push([a, b]);
  }
  return lista;
}

export function planejarTrechos({ duracao, viradas = [], pausas = [], esquema, inicioTrilha = 0 }) {
  const marcas = [];
  const queda = Number(esquema.queda_antes_golpe_s || 0);
  const abafar = esquema.abafar_antes_virada || { ativo: false };
  for (const v of viradas) {
    if (abafar.ativo) marcas.push([v - abafar.janela_s, v - queda, 'abafado']);
    if (queda > 0) marcas.push([v - queda, v, 'mudo']);
  }
  if (esquema.para_nas_pausas) for (const [a, b] of pausas) marcas.push([a + 0.05, b - 0.05, 'mudo']);
  const validas = marcas
    .map(([a, b, m]) => [Math.max(0, a), Math.min(duracao, b), m])
    .filter(([a, b]) => b - a >= 0.05);
  const pontos = new Set([0, duracao]);
  for (const [a, b] of validas) {
    pontos.add(r3(a));
    pontos.add(r3(b));
  }
  const ordem = [...pontos].sort((x, y) => x - y);
  const trechos = [];
  for (let i = 0; i < ordem.length - 1; i += 1) {
    const a = ordem[i];
    const b = ordem[i + 1];
    if (b - a < 0.001) continue;
    const meio = (a + b) / 2;
    let modo = 'cheio';
    for (const [x, y, m] of validas) if (meio >= x && meio < y && PRIORIDADE[m] > PRIORIDADE[modo]) modo = m;
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo[3] === modo) ultimo[1] = b;
    else trechos.push([a, b, 0, modo]);
  }
  return trechos.map(([d0, d1, , modo]) => [r3(d0), r3(d1), r3(inicioTrilha + d0), modo]);
}

// Grafo da trilha: entrada 1 = voz (chave do ducking), entrada 2 = música.
export function grafoDaTrilha({ trechos, duracao, ganhoDb = 0, esquema }) {
  const partes = [];
  const rotulos = [];
  const abafar = esquema.abafar_antes_virada || {};
  trechos.forEach(([d0, d1, s0, modo], i) => {
    if (modo === 'mudo') return;
    const dur = r3(d1 - d0);
    if (dur < 0.03) return;
    let f = `[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=${s0}:duration=${dur},asetpts=PTS-STARTPTS`;
    f += `,afade=t=in:d=0.012,afade=t=out:st=${r3(Math.max(dur - 0.02, 0))}:d=0.02`;
    if (modo === 'abafado') f += `,lowpass=f=${abafar.hz},volume=${abafar.volume}`;
    f += `,adelay=${Math.round(d0 * 1000)}:all=1[m${i}]`;
    partes.push(f);
    rotulos.push(`[m${i}]`);
  });
  const fade = Number(esquema.fade_final_s || 0);
  const fim = `apad,atrim=duration=${r3(duracao)},volume=${r3(ganhoDb)}dB${fade > 0 ? `,afade=t=out:st=${r3(Math.max(0, duracao - fade))}:d=${r3(fade)}` : ''}[mus]`;
  if (rotulos.length) partes.push(`${rotulos.join('')}amix=inputs=${rotulos.length}:normalize=0,${fim}`);
  else partes.push(`anullsrc=r=48000:cl=stereo,${fim}`);
  partes.push(`[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${r3(duracao)}[chave]`);
  const d = SOM.ducking;
  partes.push(`[mus][chave]sidechaincompress=threshold=${d.threshold}:ratio=${d.ratio}:attack=${d.attackMs}:release=${d.releaseMs}[musd]`);
  return partes.join(';');
}

// Grafo da mixagem completa: entrada 0 = vídeo sem trilha (voz + efeitos), 1 = voz, 2 = música.
export function grafoDaMixagem({ trechos, duracao, ganhoDb, esquema, semMusica = false }) {
  const base = `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${r3(duracao)}[base]`;
  if (semMusica) return `${base};[base]anull[a]`;
  return `${grafoDaTrilha({ trechos, duracao, ganhoDb, esquema })};${base};[base][musd]amix=inputs=2:normalize=0:duration=first[a]`;
}

export function grafoFinal(ganhoDb) {
  return `[1:a]volume=${r3(ganhoDb)}dB,alimiter=limit=${SOM.limiter}:attack=5:release=80:level=disabled,aformat=sample_rates=48000:channel_layouts=stereo[a]`;
}

// Ganho para levar a trilha a 14 dB abaixo da voz, com teto.
export function ganhoDaTrilha(lufsVoz, lufsTrilha) {
  const alvo = lufsVoz - SOM.trilhaAbaixoDaVozDb;
  return r3(Math.min(SOM.ganhoTrilhaMaxDb, alvo - lufsTrilha));
}

export const FILTRO_CELULAR = `highpass=f=${SOM.celular.highpassHz},highpass=f=${SOM.celular.highpassHz}`;

export function avaliarCelular({ lufsTrilhaFinal, lufsCelularFinal }) {
  const queda = lufsTrilhaFinal - lufsCelularFinal;
  return lufsCelularFinal >= SOM.celular.minimoLufs && queda <= SOM.celular.quedaMaxLu;
}

export function distanciaAceita(db) {
  return db >= SOM.trilhaAceitaMinDb && db <= SOM.trilhaAceitaMaxDb;
}

export function inicioDaTrilha(duracaoTrilha, duracaoVideo) {
  if (!duracaoTrilha || duracaoTrilha <= duracaoVideo + 5) return 0;
  return r3(Math.min(20, (duracaoTrilha - duracaoVideo) / 2));
}
