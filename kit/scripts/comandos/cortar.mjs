// Corta o vídeo bruto nos trechos escolhidos (trechos.json) e gera o take 1080x1920 30 fps e a voz.
import fs from 'node:fs';
import { daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, mudarEtapa, exigirArquivo } from '../lib/projeto.mjs';
import { lerJson } from '../lib/json.mjs';
import { validarCom } from '../lib/validar.mjs';
import { falha, reprovado, aviso } from '../lib/saida.mjs';
import { ffmpegOk, filtrosDisponiveis, sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { MASTER, SOM } from '../lib/regras.mjs';
import { arred, linhas } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';
import { ajustarTrechos } from '../lib/ajuste-de-corte.mjs';
import { medirRosto, resumoDoRosto, cortePeloRosto, medirRostoDoTake } from '../lib/rosto.mjs';
import { vozLimpa } from '../lib/voz-limpa.mjs';
import { somDoBruto, RELOGIO_DO_ARQUIVO } from '../lib/som-do-bruto.mjs';

const r3 = (n) => arred(n, 3);

// vozLimpa: o som vem da segunda entrada (voz limpa do bruto, mesmo tempo); sem ela, do próprio
// vídeo, com o filtro de ruído antigo (afftdn).
export function grafoDeCorte(trechos, { hdr = false, cortarX = null, vozLimpa = false } = {}) {
  const partes = [];
  const pares = [];
  const som = vozLimpa ? '1:a' : '0:a';
  trechos.forEach((t, i) => {
    const dur = r3(t.fim - t.inicio);
    partes.push(`[0:v]trim=start=${r3(t.inicio)}:end=${r3(t.fim)},setpts=PTS-STARTPTS[v${i}]`);
    partes.push(`[${som}]atrim=start=${r3(t.inicio)}:end=${r3(t.fim)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${r3(Math.max(0, dur - 0.03))}:d=0.03[a${i}]`);
    pares.push(`[v${i}][a${i}]`);
  });
  partes.push(`${pares.join('')}concat=n=${trechos.length}:v=1:a=1[vc][ac]`);
  const cor = hdr ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,' : '';
    // Vídeo deitado: o recorte 9:16 vai para onde está o rosto (cortarX); sem medida, fica no meio.
  const recorte = cortarX === null ? `${MASTER.largura}:${MASTER.altura}` : `${MASTER.largura}:${MASTER.altura}:${cortarX}:0`;
  partes.push(`[vc]${cor}fps=${MASTER.fps},scale=${MASTER.largura}:${MASTER.altura}:force_original_aspect_ratio=increase,crop=${recorte},setsar=1,format=yuv420p[v]`);
  const ruido = vozLimpa ? '' : 'afftdn=nf=-25,';
  partes.push(`[ac]highpass=f=80,${ruido}loudnorm=I=${SOM.vozLufs}:TP=-3:LRA=11,aresample=${MASTER.taxaAudio},aformat=channel_layouts=stereo,asplit=2[a][voz]`);
  return partes.join(';\n');
}

export function conferirTrechos(dados, duracao) {
  const problemas = [];
  (dados.trechos || []).forEach((t, i) => {
    if (!(t.fim > t.inicio)) problemas.push({ onde: `trechos[${i}]`, problema: '"fim" precisa ser depois de "inicio"' });
    if (t.inicio < 0 || t.fim > duracao + 0.05) problemas.push({ onde: `trechos[${i}]`, problema: `fora do vídeo (que tem ${duracao} s)` });
  });
  if (!(dados.trechos || []).length) problemas.push({ onde: 'trechos', problema: 'nenhum trecho escolhido' });
  return [...problemas, ...sobrepostos(dados.trechos || [])];
}

// Dois trechos com o mesmo pedaço do bruto repetem a fala no take. A ordem da lista pode ser
// qualquer uma (o gancho pode vir do fim); o que não pode é pedaço em comum.
export function sobrepostos(trechos) {
  const problemas = [];
  trechos.forEach((a, i) => {
    trechos.slice(i + 1).forEach((b, k) => {
      if (a.inicio < b.fim && b.inicio < a.fim) problemas.push({ onde: `trechos[${i}] e trechos[${i + 1 + k}]`, problema: 'pegam o mesmo pedaço do vídeo; a fala sairia repetida' });
    });
  });
  return problemas;
}

// A transcrição do bruto traz o mapa da fala. Sem ela, ou se for de outro vídeo, o corte
// segue com os trechos como estão e avisa.
const TOLERANCIA_DURACAO_S = 0.5;
function mapaDaFala(projeto, duracao) {
  const arq = projeto.arq('transcricao-bruta.json');
  if (!fs.existsSync(arq)) return { transcricao: null, motivo: 'sem transcricao-bruta.json' };
  const transcricao = lerJson(arq);
  if (transcricao.relogio !== RELOGIO_DO_ARQUIVO) return { transcricao: null, motivo: 'transcrição antiga, de antes do mapa da fala' };
  if (Math.abs((transcricao.duracao_s ?? 0) - duracao) > TOLERANCIA_DURACAO_S) return { transcricao: null, motivo: 'transcrição de outro vídeo' };
  return { transcricao, motivo: null };
}

// Vídeo deitado: mede o rosto no bruto, só dentro dos trechos, para saber onde recortar.
async function corteDoDeitado(projeto, bruto, info, trechos, avisos) {
  if (!(info.largura > info.altura)) return null;
  progresso('Procurando o rosto para recortar o vídeo deitado...');
  const r = await medirRosto(bruto, projeto.arq('corte', 'rosto-bruto.json'), { trechos, rotacao: info.rotacao });
  const x = r.medida ? cortePeloRosto(resumoDoRosto(r.medida), info.largura, info.altura) : null;
  if (x === null) avisos.push(aviso('ROSTO_NAO_MEDIDO', { onde: 'bruto', detalhe: r.erro || 'rosto pouco visível' }));
  return x;
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
  const mapa = mapaDaFala(projeto, info.duracao);
  const ajuste = mapa.transcricao
    ? ajustarTrechos(trechos.trechos, mapa.transcricao, info.duracao)
    : { trechos: trechos.trechos, ajustes: [], problemas: [], avisos: [aviso('SEM_MAPA_DE_FALA', { motivo: mapa.motivo })] };
  if (ajuste.problemas.length) reprovado('TRECHOS_INVALIDOS', { problemas: ajuste.problemas });
  if (!info.tem_audio) falha('VIDEO_SEM_SOM', {});
  if (info.hdr) {
    const filtros = await filtrosDisponiveis();
    if (!filtros.has('zscale') || !filtros.has('tonemap')) falha('HDR_SEM_ZSCALE', {});
  }
  const avisos = [...ajuste.avisos];
  fs.mkdirSync(projeto.arq('corte'), { recursive: true });
  const cortarX = await corteDoDeitado(projeto, bruto, info, ajuste.trechos, avisos);
  progresso('Limpando o ruído de fundo da sua voz...');
  const limpa = await vozLimpa(projeto.arq('corte'), await somDoBruto(projeto, bruto));
  if (limpa.erro) avisos.push(aviso('VOZ_SEM_LIMPEZA', { detalhe: limpa.erro }));
  const grafo = grafoDeCorte(ajuste.trechos, { hdr: info.hdr, cortarX, vozLimpa: Boolean(limpa.arquivo) });
  const arqGrafo = projeto.arq('corte', 'grafo.txt');
  fs.writeFileSync(projeto.arq('corte', 'trechos-ajustados.json'), `${JSON.stringify({ fonte: 'bruto', trechos: ajuste.trechos, ajustes: ajuste.ajustes }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(arqGrafo, linhas(grafo).join('\n'), 'utf8');
  progresso('Cortando as pausas e os erros...');
  await ffmpegOk(
    [
      '-y', '-i', bruto, ...(limpa.arquivo ? ['-i', limpa.arquivo] : []), '-/filter_complex', arqGrafo,
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(MASTER.crfTake), '-pix_fmt', 'yuv420p',
      '-r', String(MASTER.fps), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', MASTER.bitrateAudio, '-ar', String(MASTER.taxaAudio), '-ac', '2', '-movflags', '+faststart', projeto.arq('take.mp4'),
      '-map', '[voz]', '-c:a', 'pcm_s16le', '-ar', String(MASTER.taxaAudio), '-ac', '2', projeto.arq('voz.wav'),
    ],
    'CORTE_FALHOU',
  );
  const take = resumoDoVideo(await sondar(projeto.arq('take.mp4')));
  progresso('Medindo onde fica o seu rosto...');
  const rosto = await medirRostoDoTake(projeto, avisos);
  mudarEtapa(projeto, 'corte');
  const total = ajuste.trechos.reduce((s, t) => s + (t.fim - t.inicio), 0);
  return {
    ok: true,
    resumo: `Take pronto: ${Math.round(take.duracao * 10) / 10} s, em ${ajuste.trechos.length} trechos.`,
    avisos,
    arquivos: { take: projeto.rel('take.mp4'), voz: projeto.rel('voz.wav'), trechos_ajustados: projeto.rel('corte', 'trechos-ajustados.json') },
    dados: { duracao_s: take.duracao, trechos: ajuste.trechos.length, soma_trechos_s: r3(total), hdr_convertido: info.hdr, ajustes: ajuste.ajustes, rosto, recorte_deitado_x: cortarX, voz_limpa: Boolean(limpa.arquivo) },
  };
}
