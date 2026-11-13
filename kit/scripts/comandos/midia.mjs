// Prepara uma mídia para o vídeo: gravação de tela, vídeo de apoio ou imagem (print, logo, foto).
// Vídeo: corta o trecho (--de, --ate), acelera (--velocidade, para timelapse), recorta um pedaço da
// tela (--corte x,y,largura,altura, em pixels do original), tira o som e grava em
// projetos/<P>/midia/<nome>.mp4, mais um quadro de amostra <nome>.jpg.
// Imagem: copia para projetos/<P>/midia/<nome>.<extensão>.
// A tela "midia" do cenas.json usa o arquivo pelo caminho "midia/<nome>.mp4".
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto } from '../lib/projeto.mjs';
import { exigir } from '../lib/args.mjs';
import { falha } from '../lib/saida.mjs';
import { ffmpegOk, sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { tipoDeMidia } from '../lib/telas-livres.mjs';
import { MASTER, MIDIA } from '../lib/regras.mjs';
import { slug } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';

// Diferença aceita entre a duração pedida e a que saiu (arredondamento de quadro do corte).
const TOLERANCIA_S = 0.15;

function numero(opcoes, nome, { min = 0, max = Infinity } = {}) {
  if (opcoes[nome] === undefined) return null;
  const v = Number(String(opcoes[nome]).split(',').join('.'));
  if (!Number.isFinite(v) || v < min || v > max) falha('ARGUMENTO_INVALIDO', { argumento: `--${nome}`, valor: String(opcoes[nome]), opcoes: [`${min} a ${max}`] });
  return v;
}

// "--corte x,y,largura,altura" em pixels do vídeo original.
export function lerCorte(texto, largura, altura) {
  if (texto === undefined) return null;
  const partes = String(texto).split(',').map((p) => Number(p.trim()));
  const [x, y, l, a] = partes;
  const valido = partes.length === 4 && partes.every((n) => Number.isFinite(n) && n >= 0) && l >= 16 && a >= 16 && x + l <= largura && y + a <= altura;
  if (!valido) falha('ARGUMENTO_INVALIDO', { argumento: '--corte', valor: String(texto), opcoes: [`x,y,largura,altura dentro de ${largura}x${altura}`] });
  const par = (n) => Math.floor(n / 2) * 2;
  return { x: par(x), y: par(y), l: par(l), a: par(a) };
}

// Filtro de vídeo: recorte, velocidade, 30 fps, largura até 1920 e cor normal.
export function filtroDaMidia({ corte = null, velocidade = 1, larguraMax = MIDIA.larguraMax }) {
  const partes = [];
  if (corte) partes.push(`crop=${corte.l}:${corte.a}:${corte.x}:${corte.y}`);
  if (velocidade !== 1) partes.push(`setpts=PTS/${velocidade}`);
  partes.push(`fps=${MASTER.fps}`);
  partes.push(`scale='min(${larguraMax},iw)':-2:flags=lanczos`);
  partes.push('setsar=1', 'format=yuv420p');
  return partes.join(',');
}

export default async function midia({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const origem = path.resolve(exigir(opcoes, 'arquivo'));
  if (!fs.existsSync(origem)) falha('ARQUIVO_NAO_ACHADO', { arquivo: origem });
  const tipo = tipoDeMidia(origem);
  if (!tipo) falha('MIDIA_FORMATO', { arquivo: path.basename(origem), aceitos: [...MIDIA.video, ...MIDIA.imagem] });
  const nome = slug(opcoes.nome === undefined || opcoes.nome === true ? path.parse(origem).name : String(opcoes.nome)) || 'midia';
  const pasta = projeto.arq(MIDIA.pasta);
  fs.mkdirSync(pasta, { recursive: true });

  if (tipo === 'imagem') {
    const soDeVideo = ['de', 'ate', 'velocidade', 'corte'].filter((n) => opcoes[n] !== undefined);
    if (soDeVideo.length) falha('ARGUMENTO_INVALIDO', { argumento: `--${soDeVideo[0]}`, valor: String(opcoes[soDeVideo[0]]), opcoes: ['só para vídeo; imagem é copiada como está'] });
    const destino = path.join(pasta, `${nome}${path.extname(origem).toLowerCase()}`);
    fs.copyFileSync(origem, destino);
    const rel = `${MIDIA.pasta}/${path.basename(destino)}`;
    return { ok: true, resumo: `Imagem pronta: ${rel}.`, arquivos: { midia: projeto.rel(rel) }, dados: { arquivo: rel, tipo } };
  }

  const info = resumoDoVideo(await sondar(origem));
  const de = numero(opcoes, 'de', { min: 0, max: info.duracao }) ?? 0;
  const ate = numero(opcoes, 'ate', { min: 0, max: info.duracao + 0.05 }) ?? info.duracao;
  if (ate - de < 0.2) falha('ARGUMENTO_INVALIDO', { argumento: '--ate', valor: String(ate), opcoes: [`depois de ${de} s`] });
  const velocidade = numero(opcoes, 'velocidade', { min: 0.25, max: MIDIA.velocidadeMax }) ?? 1;
  const corte = lerCorte(opcoes.corte, info.largura, info.altura);
  const destino = path.join(pasta, `${nome}.mp4`);
  const quadro = path.join(pasta, `${nome}.jpg`);
  progresso('Preparando a gravação de tela...');
  const filtro = filtroDaMidia({ corte, velocidade });
  await ffmpegOk(['-y', '-ss', String(de), '-t', String(ate - de), '-i', origem, '-an', '-vf', filtro, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(MIDIA.crf), '-movflags', '+faststart', destino], 'MIDIA_FALHOU');
  await ffmpegOk(['-y', '-ss', '0.3', '-i', destino, '-frames:v', '1', '-q:v', '3', quadro], 'MIDIA_FALHOU');
  const pronto = resumoDoVideo(await sondar(destino));
  const esperado = (ate - de) / velocidade;
  if (Math.abs(pronto.duracao - esperado) > TOLERANCIA_S + 2 / MASTER.fps) {
    falha('MIDIA_FALHOU', { detalhe: `saiu com ${pronto.duracao} s; o esperado era ${Math.round(esperado * 100) / 100} s` });
  }
  const rel = `${MIDIA.pasta}/${nome}.mp4`;
  return {
    ok: true,
    resumo: `Mídia pronta: ${rel}, ${pronto.duracao} s, ${pronto.largura}x${pronto.altura}.`,
    arquivos: { midia: projeto.rel(rel), quadro: projeto.rel(`${MIDIA.pasta}/${nome}.jpg`) },
    dados: { arquivo: rel, tipo, duracao_s: pronto.duracao, largura: pronto.largura, altura: pronto.altura, velocidade, de, ate },
  };
}
