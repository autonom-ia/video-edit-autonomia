// Executa a mixagem com ffmpeg: mede a trilha, escolhe o ganho, mixa e confere o alvo.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegOk, loudness, sondar } from './ffmpeg.mjs';
import { grafoDaTrilha, grafoDaMixagem, grafoFinal, ganhoDaTrilha, avaliarCelular, distanciaAceita, FILTRO_CELULAR, inicioDaTrilha, planejarTrechos } from './mixer.mjs';
import { SOM } from './regras.mjs';
import { arred } from './texto.mjs';
import { falha } from './saida.mjs';

const TENTATIVAS = 4;
// Abaixo disso o limitador já espreme a voz. Melhor falhar e avisar do que entregar o som achatado.
const TETO_MINIMO_DBFS = -6;

// Dentro do alvo de entrega: volume a ±0,3 LU de −14 (folga para a conferência de ±0,5) e pico no teto.
function noAlvo(medida) {
  return Math.abs(SOM.alvoLufs - medida.lufs) <= SOM.toleranciaLufs * 0.6 && medida.pico_dbtp <= SOM.picoMaxDbtp;
}

const r2 = (n) => arred(n, 2);

function entradas({ semTrilha, voz, musica, precisaLaco }) {
  const lista = ['-i', semTrilha, '-i', voz];
  if (musica) {
    if (precisaLaco) lista.push('-stream_loop', '-1');
    lista.push('-i', musica);
  }
  return lista;
}

async function escreverGrafo(pasta, nome, grafo) {
  const arquivo = path.join(pasta, nome);
  fs.writeFileSync(arquivo, grafo, 'utf8');
  return arquivo;
}

export async function prepararTrilha({ musica, duracao, viradas, pausas, esquema }) {
  const sonda = await sondar(musica);
  const durTrilha = Number((sonda.format && sonda.format.duration) || 0);
  const inicio = inicioDaTrilha(durTrilha, duracao);
  const precisaLaco = durTrilha > 0 && durTrilha < inicio + duracao + 0.5;
  const trechos = planejarTrechos({ duracao, viradas, pausas, esquema, inicioTrilha: inicio });
  return { trechos, precisaLaco, inicio };
}

// Mede a trilha já com ducking (ganho 0), a voz e o teste de celular.
export async function medirTrilha({ pastaTmp, semTrilha, voz, musica, duracao, esquema, viradas, pausas, lufsVoz }) {
  const prep = await prepararTrilha({ musica, duracao, viradas, pausas, esquema });
  const grafo = grafoDaTrilha({ trechos: prep.trechos, duracao, ganhoDb: 0, esquema });
  const arqGrafo = await escreverGrafo(pastaTmp, `trilha-${esquema.nome}.txt`, grafo);
  const wav = path.join(pastaTmp, `trilha-${esquema.nome}.wav`);
  await ffmpegOk(['-y', ...entradas({ semTrilha, voz, musica, precisaLaco: prep.precisaLaco }), '-/filter_complex', arqGrafo, '-map', '[musd]', '-t', String(duracao), '-ar', '48000', '-ac', '2', wav], 'MIXAGEM_FALHOU');
  const bruta = await loudness(wav);
  const cel = await loudness(wav, FILTRO_CELULAR);
  const ganho = ganhoDaTrilha(lufsVoz, bruta.lufs);
  fs.rmSync(wav, { force: true });
  return { ...prep, lufsTrilha: bruta.lufs, lufsCelular: cel.lufs, ganho };
}

// Mixa e entrega o MP4 final: vídeo copiado, áudio estéreo a −14 LUFS e pico ≤ −1 dBTP.
export async function mixar({ pastaTmp, semTrilha, voz, musica, duracao, esquema, viradas, pausas, saida }) {
  const lufsVoz = (await loudness(voz)).lufs;
  let medida = null;
  let grafo;
  let precisaLaco = false;
  if (musica) {
    medida = await medirTrilha({ pastaTmp, semTrilha, voz, musica, duracao, esquema, viradas, pausas, lufsVoz });
    precisaLaco = medida.precisaLaco;
    grafo = grafoDaMixagem({ trechos: medida.trechos, duracao, ganhoDb: medida.ganho, esquema });
  } else {
    grafo = grafoDaMixagem({ duracao, semMusica: true });
  }
  const arqGrafo = await escreverGrafo(pastaTmp, `mix-${musica ? esquema.nome : 'sem-musica'}.txt`, grafo);
  const wav = path.join(pastaTmp, 'mix.wav');
  await ffmpegOk(['-y', ...entradas({ semTrilha, voz, musica, precisaLaco }), '-/filter_complex', arqGrafo, '-map', '[a]', '-t', String(duracao), '-ar', '48000', '-ac', '2', wav], 'MIXAGEM_FALHOU');
  const antes = await loudness(wav);
  let ganhoFinal = r2(SOM.alvoLufs - antes.lufs);
  let teto = SOM.limiterDbfs;
  let resultado = null;
  try {
    for (let tentativa = 0; tentativa < TENTATIVAS; tentativa += 1) {
      await ffmpegOk(
        ['-y', '-i', semTrilha, '-i', wav, '-filter_complex', grafoFinal(ganhoFinal, teto), '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', saida],
        'MIXAGEM_FALHOU',
      );
      resultado = await loudness(saida);
      if (noAlvo(resultado)) break;
      // Pico alto se resolve baixando o teto do limitador; volume fora se resolve no ganho.
      // Mexer só no ganho para conter o pico derruba o volume, e o laço fica oscilando.
      if (resultado.pico_dbtp > SOM.picoMaxDbtp) teto = r2(Math.max(TETO_MINIMO_DBFS, teto - (resultado.pico_dbtp - SOM.picoMaxDbtp) - 0.2));
      ganhoFinal = r2(ganhoFinal + (SOM.alvoLufs - resultado.lufs));
    }
    if (!noAlvo(resultado)) {
      falha('MIXAGEM_FORA_DO_ALVO', { lufs: resultado.lufs, pico_dbtp: resultado.pico_dbtp, alvo_lufs: SOM.alvoLufs, pico_max_dbtp: SOM.picoMaxDbtp, teto_limitador_dbfs: teto });
    }
  } catch (erro) {
    // Arquivo pela metade ou fora do alvo não pode ficar para o creditar achar depois.
    fs.rmSync(saida, { force: true });
    throw erro;
  } finally {
    fs.rmSync(wav, { force: true });
  }
  const info = { lufs: resultado.lufs, pico_dbtp: resultado.pico_dbtp, ganho_final_db: ganhoFinal, teto_limitador_dbfs: teto, lufs_voz: lufsVoz };
  if (medida) {
    const vozFinal = lufsVoz + ganhoFinal;
    const trilhaFinal = medida.lufsTrilha + medida.ganho + ganhoFinal;
    const celFinal = medida.lufsCelular + medida.ganho + ganhoFinal;
    info.distancia_voz_trilha_db = r2(vozFinal - trilhaFinal);
    info.lufs_trilha = r2(trilhaFinal);
    info.lufs_celular = r2(celFinal);
    info.celular_audivel = avaliarCelular({ lufsTrilhaFinal: trilhaFinal, lufsCelularFinal: celFinal });
    info.distancia_ok = distanciaAceita(info.distancia_voz_trilha_db);
  }
  return info;
}
