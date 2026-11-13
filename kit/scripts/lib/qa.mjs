// Conferência do MP4 decodificado (spec D.6, "QA"). Usada pelos comandos qa e entregar.
import fs from 'node:fs';
import path from 'node:path';
import { sondar, resumoDoVideo, loudness, ffmpeg, valoresDeMetadado, temposComDoisPontos } from './ffmpeg.mjs';
import { temFaststart } from './mp4.mjs';
import { MASTER, SOM, QA, RITMO, SFX_PICO } from './regras.mjs';
import { lerJson } from './json.mjs';
import { arred } from './texto.mjs';

const r2 = (n) => arred(n, 2);

function item(id, ok, texto, dados = {}) {
  return { id, ok: Boolean(ok), texto, ...dados };
}

async function brilhoDoQuadroZero(arquivo) {
  const r = await ffmpeg(['-nostats', '-i', arquivo, '-vf', 'select=eq(n\\,0),signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-frames:v', '1', '-f', 'null', '-']);
  const v = valoresDeMetadado(r.erro, 'lavfi.signalstats.YAVG');
  return v.length ? v[0] : null;
}

async function congelamentos(arquivo) {
  const r = await ffmpeg(['-nostats', '-i', arquivo, '-vf', `freezedetect=n=-60dB:d=${QA.congelamentoMaxS}`, '-map', '0:v:0', '-f', 'null', '-']);
  return temposComDoisPontos(r.erro, 'lavfi.freezedetect.freeze_start');
}

async function silencios(arquivo) {
  const r = await ffmpeg(['-nostats', '-i', arquivo, '-af', `silencedetect=n=${QA.silencioDb}dB:d=${SOM.silencioBordaMaxS}`, '-map', '0:a:0', '-f', 'null', '-']);
  return { inicios: temposComDoisPontos(r.erro, 'silence_start'), fins: temposComDoisPontos(r.erro, 'silence_end') };
}

// Toda tela que aparece precisa de um som batendo no quadro em que ela aparece (o "entra" menos
// a antecipação do cartão). Mede o golpe do som (pico), não o começo do arquivo (Issue #13).
export function checarSonsNasTrocas(telas, sons, janela = QA.somNaTrocaS) {
  const faltando = [];
  for (const t of telas || []) {
    if (typeof t.entra !== 'number') continue;
    const aparece = Math.max(0, t.entra - RITMO.antecipacaoCardS);
    // sons.json de montagem antiga não tem "golpe": calcula pelo começo e pelo pico do efeito.
    const golpe = (s) => (typeof s.golpe === 'number' ? s.golpe : s.inicio + (SFX_PICO[s.efeito] || 0));
    const tem = (sons || []).some((s) => Math.abs(golpe(s) - aparece) <= janela);
    if (!tem) faltando.push({ tela: t.id, segundo: Math.round(aparece * 1000) / 1000 });
  }
  return faltando;
}

export async function conferirMp4({ arquivo, projeto, rapido = false }) {
  const itens = [];
  const sonda = await sondar(arquivo);
  const v = resumoDoVideo(sonda);
  const formatoOk = v.codec_video === MASTER.codecVideo && v.largura === MASTER.largura && v.altura === MASTER.altura && Math.abs(v.fps - MASTER.fps) < 0.05
    && v.codec_audio === MASTER.codecAudio && v.canais === MASTER.canais && v.taxa_audio === MASTER.taxaAudio;
  itens.push(item('formato', formatoOk, `${v.largura}x${v.altura}, ${v.fps} fps, ${v.codec_video}, áudio ${v.codec_audio} ${v.canais} canais ${v.taxa_audio} Hz`, { valor: v }));

  const som = await loudness(arquivo);
  const lufsOk = som.lufs !== null && Math.abs(som.lufs - SOM.alvoLufs) <= SOM.toleranciaLufs;
  itens.push(item('volume', lufsOk, `${r2(som.lufs)} LUFS (alvo ${SOM.alvoLufs} ±${SOM.toleranciaLufs})`, { valor: som.lufs }));
  const picoOk = som.pico_dbtp !== null && som.pico_dbtp <= SOM.picoMaxDbtp + 0.05;
  itens.push(item('pico', picoOk, `pico ${r2(som.pico_dbtp)} dBTP (máximo ${SOM.picoMaxDbtp})`, { valor: som.pico_dbtp }));

  const fs0 = temFaststart(arquivo);
  itens.push(item('faststart', fs0, fs0 ? 'abre rápido no celular (moov antes de mdat)' : 'moov depois de mdat: demora para abrir'));

  const yavg = await brilhoDoQuadroZero(arquivo);
  itens.push(item('quadro_zero', yavg !== null && yavg >= QA.quadroZeroYavgMin, `brilho do primeiro quadro ${yavg === null ? '?' : r2(yavg)} (mínimo ${QA.quadroZeroYavgMin})`, { valor: yavg }));

  const congela = await congelamentos(arquivo);
  itens.push(item('congelamento', congela.length === 0, congela.length ? `imagem parada por mais de ${QA.congelamentoMaxS} s em ${congela.map((t) => `${r2(t)} s`).join(', ')}` : 'nenhuma imagem parada', { valor: congela }));

  const sil = await silencios(arquivo);
  const noInicio = sil.inicios.some((t) => t <= 0.05);
  const ultimoInicio = sil.inicios.length ? sil.inicios[sil.inicios.length - 1] : null;
  const ultimoFim = sil.fins.length ? sil.fins[sil.fins.length - 1] : null;
  const noFim = ultimoInicio !== null && (ultimoFim === null || ultimoFim < ultimoInicio || ultimoFim >= v.duracao - 0.1);
  itens.push(item('silencio_bordas', !noInicio && !noFim, noInicio ? 'silêncio no começo' : noFim ? 'silêncio no fim' : 'sem silêncio no começo nem no fim'));

  if (projeto) {
    const cenas = lerJson(projeto.arq('cenas.json'), null);
    if (cenas && typeof cenas.duracao_alvo_s === 'number' && cenas.duracao_alvo_s > 0) {
      const alvo = cenas.duracao_alvo_s;
      const ok = Math.abs(v.duracao - alvo) <= (alvo * QA.duracaoToleranciaPct) / 100;
      itens.push(item('duracao', ok, `${r2(v.duracao)} s (alvo ${alvo} s ±${QA.duracaoToleranciaPct}%)`, { valor: v.duracao }));
    }
    const sons = lerJson(projeto.arq('comp', 'sons.json'), null);
    if (cenas && sons) {
      const faltando = checarSonsNasTrocas(cenas.telas, sons);
      itens.push(item('som_nas_trocas', faltando.length === 0, faltando.length ? `tela sem som: ${faltando.map((f) => `${f.tela} (${f.segundo} s)`).join(', ')}` : 'toda troca de tela tem som', { valor: faltando }));
    }
    const mix = lerJson(projeto.arq('trilha', 'mixagem.json'), null);
    if (mix && mix.com_musica) {
      itens.push(item('trilha', Boolean(mix.distancia_ok && mix.celular_audivel), `trilha ${mix.distancia_voz_trilha_db} dB abaixo da voz (aceito ${SOM.trilhaAceitaMinDb} a ${SOM.trilhaAceitaMaxDb}); no celular ${mix.celular_audivel ? 'dá para ouvir' : 'some'}`, { valor: mix.distancia_voz_trilha_db }));
    }
  }
  const ok = itens.every((i) => i.ok);
  return { arquivo: path.basename(arquivo), ok, duracao: v.duracao, itens, rapido, quando: new Date().toISOString() };
}

export function relatorioEmTexto(rel) {
  const linhas = [`# Conferência de ${rel.arquivo}`, '', rel.ok ? 'Resultado: APROVADO' : 'Resultado: REPROVADO', ''];
  for (const i of rel.itens) linhas.push(`- ${i.ok ? 'ok' : 'FALHOU'} · ${i.id}: ${i.texto}`);
  linhas.push('');
  return linhas.join('\n');
}

export function salvarRelatorio(pasta, nome, rel) {
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, `${nome}.json`), `${JSON.stringify(rel, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(pasta, `${nome}.md`), relatorioEmTexto(rel), 'utf8');
}
