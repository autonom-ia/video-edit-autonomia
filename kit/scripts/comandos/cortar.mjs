// Corta o vídeo bruto nos trechos escolhidos (trechos.json) e gera o take 1080x1920 30 fps e a voz.
import fs from 'node:fs';
import { daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, mudarEtapa, exigirArquivo } from '../lib/projeto.mjs';
import { lerJson } from '../lib/json.mjs';
import { validarCom } from '../lib/validar.mjs';
import { falha, reprovado } from '../lib/saida.mjs';
import { ffmpegOk, filtrosDisponiveis, sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { MASTER, SOM } from '../lib/regras.mjs';
import { arred, linhas } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';

const r3 = (n) => arred(n, 3);

export function grafoDeCorte(trechos, { hdr = false } = {}) {
  const partes = [];
  const pares = [];
  trechos.forEach((t, i) => {
    const dur = r3(t.fim - t.inicio);
    partes.push(`[0:v]trim=start=${r3(t.inicio)}:end=${r3(t.fim)},setpts=PTS-STARTPTS[v${i}]`);
    partes.push(`[0:a]atrim=start=${r3(t.inicio)}:end=${r3(t.fim)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${r3(Math.max(0, dur - 0.03))}:d=0.03[a${i}]`);
    pares.push(`[v${i}][a${i}]`);
  });
  partes.push(`${pares.join('')}concat=n=${trechos.length}:v=1:a=1[vc][ac]`);
  const cor = hdr ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,' : '';
  partes.push(`[vc]${cor}fps=${MASTER.fps},scale=${MASTER.largura}:${MASTER.altura}:force_original_aspect_ratio=increase,crop=${MASTER.largura}:${MASTER.altura},setsar=1,format=yuv420p[v]`);
  partes.push(`[ac]highpass=f=80,afftdn=nf=-25,loudnorm=I=${SOM.vozLufs}:TP=-3:LRA=11,aresample=${MASTER.taxaAudio},aformat=channel_layouts=stereo,asplit=2[a][voz]`);
  return partes.join(';\n');
}

export function conferirTrechos(dados, duracao) {
  const problemas = [];
  (dados.trechos || []).forEach((t, i) => {
    if (!(t.fim > t.inicio)) problemas.push({ onde: `trechos[${i}]`, problema: '"fim" precisa ser depois de "inicio"' });
    if (t.inicio < 0 || t.fim > duracao + 0.05) problemas.push({ onde: `trechos[${i}]`, problema: `fora do vídeo (que tem ${duracao} s)` });
  });
  if (!(dados.trechos || []).length) problemas.push({ onde: 'trechos', problema: 'nenhum trecho escolhido' });
  return problemas;
}

export default async function cortar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const origem = lerJson(exigirArquivo(projeto.arq('bruto', 'origem.json')));
  const bruto = exigirArquivo(daRaiz(origem.arquivo), 'SEM_VIDEO');
  const trechos = lerJson(exigirArquivo(projeto.arq('trechos.json')));
  const erros = validarCom('trechos', trechos);
  const info = resumoDoVideo(await sondar(bruto));
  const problemas = [...erros.map((e) => ({ onde: e.caminho, problema: e.problema })), ...conferirTrechos(trechos, info.duracao)];
  if (problemas.length) reprovado('TRECHOS_INVALIDOS', { problemas });
  if (!info.tem_audio) falha('VIDEO_SEM_SOM', {});
  if (info.hdr) {
    const filtros = await filtrosDisponiveis();
    if (!filtros.has('zscale') || !filtros.has('tonemap')) falha('HDR_SEM_ZSCALE', {});
  }
  const grafo = grafoDeCorte(trechos.trechos, { hdr: info.hdr });
  const arqGrafo = projeto.arq('corte', 'grafo.txt');
  fs.mkdirSync(projeto.arq('corte'), { recursive: true });
  fs.writeFileSync(arqGrafo, linhas(grafo).join('\n'), 'utf8');
  progresso('Cortando as pausas e os erros...');
  await ffmpegOk(
    [
      '-y', '-i', bruto, '-/filter_complex', arqGrafo,
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(MASTER.crfTake), '-pix_fmt', 'yuv420p',
      '-r', String(MASTER.fps), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', MASTER.bitrateAudio, '-ar', String(MASTER.taxaAudio), '-ac', '2', '-movflags', '+faststart', projeto.arq('take.mp4'),
      '-map', '[voz]', '-c:a', 'pcm_s16le', '-ar', String(MASTER.taxaAudio), '-ac', '2', projeto.arq('voz.wav'),
    ],
    'CORTE_FALHOU',
  );
  const take = resumoDoVideo(await sondar(projeto.arq('take.mp4')));
  mudarEtapa(projeto, 'corte');
  const total = trechos.trechos.reduce((s, t) => s + (t.fim - t.inicio), 0);
  return {
    ok: true,
    resumo: `Take pronto: ${Math.round(take.duracao * 10) / 10} s, em ${trechos.trechos.length} trechos.`,
    arquivos: { take: projeto.rel('take.mp4'), voz: projeto.rel('voz.wav') },
    dados: { duracao_s: take.duracao, trechos: trechos.trechos.length, soma_trechos_s: r3(total), hdr_convertido: info.hdr },
  };
}
