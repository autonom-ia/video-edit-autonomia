// Dados que a mixagem precisa do projeto: viradas (golpes), pausas da fala e esquemas.
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';
import { lerJson } from './json.mjs';
import { tempoDoGolpe } from './composicao.mjs';
import { pausasDaFala } from './mixer.mjs';
import { falha } from './saida.mjs';
import { exigirArquivo } from './projeto.mjs';
import { sondar, resumoDoVideo } from './ffmpeg.mjs';

export const ESQUEMAS = ['equilibrada', 'abafada', 'silencio'];

export function lerEsquema(nome) {
  if (!ESQUEMAS.includes(nome)) falha('ARGUMENTO_INVALIDO', { argumento: '--esquema', valor: nome, opcoes: ESQUEMAS });
  return JSON.parse(fs.readFileSync(path.join(KIT, 'molde', 'variantes', `${nome}.json`), 'utf8'));
}

export async function contextoDaMixagem(projeto) {
  const semTrilha = exigirArquivo(projeto.arq('sem-trilha.mp4'));
  const voz = exigirArquivo(projeto.arq('voz.wav'));
  const cenas = lerJson(exigirArquivo(projeto.arq('cenas.json')));
  const transcricao = lerJson(projeto.arq('transcricao.json'), { palavras: [] });
  const duracao = resumoDoVideo(await sondar(semTrilha)).duracao;
  const viradas = (cenas.cenas || []).filter((c) => c.virada).map((c) => tempoDoGolpe(c)).filter((t) => t > 0.4 && t < duracao);
  const pausas = pausasDaFala(transcricao.palavras || []);
  const pastaTmp = projeto.arq('trilha', 'tmp');
  fs.mkdirSync(pastaTmp, { recursive: true });
  return { semTrilha, voz, duracao, viradas, pausas, pastaTmp };
}
