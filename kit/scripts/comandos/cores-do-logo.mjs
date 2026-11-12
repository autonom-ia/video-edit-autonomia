// Tira 5 cores do logo do aluno (ffmpeg palettegen) e cria a "paleta 0".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PASTAS, daRaiz } from '../lib/caminhos.mjs';
import { exigir } from '../lib/args.mjs';
import { falha } from '../lib/saida.mjs';
import { ffmpeg, ffmpegBin } from '../lib/ffmpeg.mjs';
import { escreverJson } from '../lib/json.mjs';
import { rgbParaHex, distancia, paletaDoLogo } from '../lib/cores.mjs';

function lerPixels(png) {
  return new Promise((resolve) => {
    const filho = spawn(ffmpegBin(), ['-v', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { windowsHide: true });
    const pedacos = [];
    filho.stdout.on('data', (d) => pedacos.push(d));
    filho.on('error', () => resolve(Buffer.alloc(0)));
    filho.on('close', () => resolve(Buffer.concat(pedacos)));
  });
}

export default async function coresDoLogo({ opcoes }) {
  const pedido = exigir(opcoes, 'arquivo');
  const arquivo = daRaiz(pedido);
  if (!fs.existsSync(arquivo)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-logo-'));
  try {
    const paleta = path.join(pasta, 'paleta.png');
    const r = await ffmpeg(['-y', '-i', arquivo, '-vf', 'scale=256:-1:flags=lanczos,palettegen=max_colors=12:reserve_transparent=0:stats_mode=full', '-frames:v', '1', paleta]);
    if (r.codigo !== 0 || !fs.existsSync(paleta)) falha('LOGO_SEM_CORES', {});
    const px = await lerPixels(paleta);
    const unicas = [];
    for (let i = 0; i + 2 < px.length; i += 3) {
      const hex = rgbParaHex(px[i], px[i + 1], px[i + 2]);
      if (!unicas.some((c) => distancia(c, hex) < 28)) unicas.push(hex);
    }
    if (!unicas.length) falha('LOGO_SEM_CORES', {});
    const cores = unicas.slice(0, 5).map((c) => c.toUpperCase());
    const papeis = paletaDoLogo(unicas);
    const ficha = { id: 0, nome: 'Cores do seu logo', cores: Object.fromEntries(Object.entries(papeis).map(([k, v]) => [k, v.toUpperCase()])) };
    escreverJson(path.join(PASTAS.marca, 'escolhas', 'paleta-0.json'), ficha);
    return {
      ok: true,
      resumo: 'Tirei as cores do logo. Elas viram a primeira opção de cores.',
      arquivos: { paleta: 'minha-marca/escolhas/paleta-0.json' },
      dados: { cores, paleta: ficha.cores },
    };
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}
