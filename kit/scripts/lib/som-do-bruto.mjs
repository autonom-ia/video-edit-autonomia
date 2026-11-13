// Som do vídeo bruto num WAV no relógio do arquivo (bruto/som.wav), extraído pelo mesmo ffmpeg
// que corta. O iPhone começa o som ~0,06 s depois da imagem e o AAC traz amostras de aquecimento
// que o ffmpeg descarta e outros leitores não. Transcrição, mapa da fala e limpeza da voz leem
// este WAV: assim todo tempo que eles medem é o tempo em que o ffmpeg corta.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { ffmpegOk } from './ffmpeg.mjs';
import { lerJson } from './json.mjs';

const TAXA = 48000;
// Marca gravada na transcrição feita deste WAV (o cortar só confia no mapa da fala com ela).
export const RELOGIO_DO_ARQUIVO = 'arquivo';

// A ficha vem do próprio arquivo no disco: bruto trocado no mesmo caminho refaz o som. Sem o
// caminho: projeto copiado ou movido continua valendo.
export function fichaDoArquivo(caminho) {
  const st = fs.statSync(caminho);
  return { tamanho: st.size, modificado_ms: Math.round(st.mtimeMs) };
}

// Mudou o jeito de extrair (argumentos do ffmpeg): o som.wav é refeito.
const versaoDaExtracao = () => crypto.createHash('sha256').update(JSON.stringify(argumentosDoSom('E', 'S'))).digest('hex');

export const mesmaFicha = (a, b) => Boolean(a && b) && Object.keys(b).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));

// "first_pts=0" completa com silêncio o começo que falta: a amostra 0 é o instante 0 do arquivo.
export function argumentosDoSom(bruto, saida) {
  return ['-y', '-i', bruto, '-map', '0:a:0', '-af', 'aresample=async=1:first_pts=0', '-ac', '1', '-ar', String(TAXA), '-c:a', 'pcm_s16le', saida];
}

export async function somDoBruto(projeto, bruto) {
  const wav = projeto.arq('bruto', 'som.wav');
  const arqFicha = projeto.arq('bruto', 'som.json');
  const ficha = { ...fichaDoArquivo(bruto), extracao: versaoDaExtracao() };
  if (fs.existsSync(wav) && mesmaFicha(lerJson(arqFicha, null), ficha)) return wav;
  const temporario = projeto.arq('bruto', 'som.parcial.wav');
  await ffmpegOk(argumentosDoSom(bruto, temporario), 'SOM_DO_BRUTO_FALHOU');
  fs.renameSync(temporario, wav);
  fs.writeFileSync(arqFicha, `${JSON.stringify(ficha, null, 2)}\n`, 'utf8');
  return wav;
}
