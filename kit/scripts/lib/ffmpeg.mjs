// FFmpeg e FFprobe: leitura do arquivo, loudness (ebur128) e filtros disponíveis.
import { binario } from './caminhos.mjs';
import { rodar, ultimasLinhas } from './executar.mjs';
import { falha } from './saida.mjs';

export const ffmpegBin = () => binario('ffmpeg');
export const ffprobeBin = () => binario('ffprobe');

export async function ffmpeg(argumentos, opcoes = {}) {
  const r = await rodar(ffmpegBin(), ['-hide_banner', '-nostdin', ...argumentos], { timeoutMs: 60 * 60 * 1000, ...opcoes });
  if (r.naoAchou) falha('FERRAMENTA_FALTANDO', { ferramenta: 'ffmpeg' });
  return r;
}

export async function ffmpegOk(argumentos, codigo = 'FFMPEG_FALHOU', opcoes = {}) {
  const r = await ffmpeg(argumentos, opcoes);
  if (r.codigo !== 0) falha(codigo, { detalhe: ultimasLinhas(r.erro, 8) });
  return r;
}

export async function sondar(arquivo) {
  const r = await rodar(ffprobeBin(), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', arquivo], { timeoutMs: 120000 });
  if (r.naoAchou) falha('FERRAMENTA_FALTANDO', { ferramenta: 'ffprobe' });
  if (r.codigo !== 0) falha('VIDEO_NAO_LIDO', { detalhe: ultimasLinhas(r.erro, 4) });
  try {
    return JSON.parse(r.saida);
  } catch {
    falha('VIDEO_NAO_LIDO', { detalhe: 'o ffprobe não devolveu JSON' });
  }
  return null;
}

// Quadros que o arquivo tem de verdade (decodifica tudo; para trechos curtos).
export async function contarQuadros(arquivo) {
  const r = await rodar(ffprobeBin(), ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', arquivo], { timeoutMs: 10 * 60 * 1000 });
  if (r.naoAchou) falha('FERRAMENTA_FALTANDO', { ferramenta: 'ffprobe' });
  const texto = String(r.saida).trim();
  const n = Number(texto);
  if (r.codigo !== 0 || !texto || !Number.isInteger(n)) falha('VIDEO_NAO_LIDO', { detalhe: ultimasLinhas(r.erro, 4) });
  return n;
}

function fracao(texto) {
  if (!texto) return 0;
  const [a, b] = String(texto).split('/');
  const n = Number(a);
  const d = b === undefined ? 1 : Number(b);
  return d ? n / d : 0;
}

export function rotacaoDe(stream) {
  let rot = 0;
  if (stream.tags && stream.tags.rotate !== undefined) rot = Number(stream.tags.rotate);
  for (const sd of stream.side_data_list || []) {
    if (sd.rotation !== undefined) rot = Number(sd.rotation);
  }
  rot = ((Math.round(rot) % 360) + 360) % 360;
  return rot;
}

export function resumoDoVideo(sonda) {
  const v = (sonda.streams || []).find((s) => s.codec_type === 'video');
  const a = (sonda.streams || []).find((s) => s.codec_type === 'audio');
  if (!v) falha('VIDEO_NAO_LIDO', { detalhe: 'o arquivo não tem imagem' });
  const rotacao = rotacaoDe(v);
  const deitado = rotacao === 90 || rotacao === 270;
  const largura = deitado ? v.height : v.width;
  const altura = deitado ? v.width : v.height;
  const transf = String(v.color_transfer || '');
  const prim = String(v.color_primaries || '');
  const hdr = transf === 'smpte2084' || transf === 'arib-std-b67' || prim === 'bt2020';
  const duracao = Number((sonda.format && sonda.format.duration) || v.duration || 0);
  return {
    largura,
    altura,
    rotacao,
    fps: Math.round(fracao(v.avg_frame_rate || v.r_frame_rate) * 1000) / 1000,
    fps_r: v.r_frame_rate || '',
    duracao: Math.round(duracao * 1000) / 1000,
    hdr,
    codec_video: v.codec_name || '',
    pix_fmt: v.pix_fmt || '',
    tem_audio: Boolean(a),
    codec_audio: a ? a.codec_name : '',
    canais: a ? Number(a.channels || 0) : 0,
    taxa_audio: a ? Number(a.sample_rate || 0) : 0,
  };
}

function numeroDepois(linha, rotulo) {
  const i = linha.indexOf(rotulo);
  if (i === -1) return null;
  const resto = linha.slice(i + rotulo.length).trim();
  const n = parseFloat(resto.split(' ')[0]);
  return Number.isFinite(n) ? n : null;
}

// Lê o "Summary:" do filtro ebur128.
export function lerResumoEbur128(texto) {
  const i = String(texto).lastIndexOf('Summary:');
  const r = { lufs: null, lra: null, pico_dbtp: null };
  if (i === -1) return r;
  let bloco = '';
  for (const linha of String(texto).slice(i).split('\n')) {
    const t = linha.trim();
    if (t.startsWith('Integrated loudness')) bloco = 'i';
    else if (t.startsWith('Loudness range')) bloco = 'lra';
    else if (t.startsWith('True peak')) bloco = 'tp';
    else if (t.startsWith('Sample peak')) bloco = 'sp';
    if (bloco === 'i' && t.startsWith('I:')) r.lufs = numeroDepois(t, 'I:');
    if (bloco === 'lra' && t.startsWith('LRA:')) r.lra = numeroDepois(t, 'LRA:');
    if (bloco === 'tp' && t.startsWith('Peak:')) r.pico_dbtp = numeroDepois(t, 'Peak:');
  }
  if (r.lufs !== null && r.lufs < -69) r.lufs = -70;
  return r;
}

export async function loudness(arquivo, filtrosAntes = '') {
  const filtro = `${filtrosAntes ? `${filtrosAntes},` : ''}ebur128=peak=true`;
  const r = await ffmpeg(['-nostats', '-i', arquivo, '-map', '0:a:0', '-af', filtro, '-f', 'null', '-']);
  if (r.codigo !== 0) falha('FFMPEG_FALHOU', { detalhe: ultimasLinhas(r.erro, 6) });
  const resumo = lerResumoEbur128(r.erro);
  if (resumo.lufs === null) resumo.lufs = -70;
  return resumo;
}

function nomesDaLista(texto, minimoColunas = 2) {
  const nomes = new Set();
  for (const linha of String(texto).split('\n')) {
    const partes = linha.trim().split(' ').filter(Boolean);
    if (partes.length >= minimoColunas) nomes.add(partes[1]);
  }
  return nomes;
}

export async function filtrosDisponiveis() {
  const r = await ffmpeg(['-filters']);
  return nomesDaLista(r.saida);
}

export async function encodersDisponiveis() {
  const r = await ffmpeg(['-encoders']);
  return nomesDaLista(r.saida);
}

export const FILTROS_NECESSARIOS = ['zscale', 'loudnorm', 'ebur128', 'sidechaincompress', 'afftdn'];

// Encontra linhas "chave=valor" na saída de metadata=print.
export function valoresDeMetadado(texto, chave) {
  const valores = [];
  for (const linha of String(texto).split('\n')) {
    const i = linha.indexOf(`${chave}=`);
    if (i !== -1) {
      const n = parseFloat(linha.slice(i + chave.length + 1).trim());
      if (Number.isFinite(n)) valores.push(n);
    }
  }
  return valores;
}

// Lê "silence_start: 1.23" e afins (formato com dois-pontos).
export function temposComDoisPontos(texto, rotulo) {
  const valores = [];
  for (const linha of String(texto).split('\n')) {
    const i = linha.indexOf(`${rotulo}:`);
    if (i !== -1) {
      const n = parseFloat(linha.slice(i + rotulo.length + 1).trim().split(' ')[0]);
      if (Number.isFinite(n)) valores.push(n);
    }
  }
  return valores;
}
