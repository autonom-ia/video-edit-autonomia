// Recorta a pessoa do fundo nas cenas cujo efeito pede recorte (capa de revista, papel, fundo verde...).
// Usa o "remove-background" do HyperFrames (modelo u2net_human_seg, Apache-2.0). Na primeira vez ele
// baixa o modelo (~170 MB). Só refaz o que está faltando ou velho; --tudo refaz todos.
// --cenas c03,c05 recorta também essas cenas, mesmo sem efeito (para testar um efeito antes de escolher).
//
// Por que em duas resoluções: o modelo custa por pixel e leva ~30 s só para carregar. Então todas as
// cenas viram um vídeo só, em 540x960, recortado de uma vez; a máscara volta ampliada para 1080x1920
// e é aplicada no take original. A borda fica igual à do recorte em 1080p, em uma fração do tempo.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto, exigirArquivo } from '../lib/projeto.mjs';
import { conferirTabela } from './telas.mjs';
import { ffmpegOk, sondar, contarQuadros } from '../lib/ffmpeg.mjs';
import { hyperframes } from '../lib/hyperframes.mjs';
import { falha } from '../lib/saida.mjs';
import { progresso, ultimasLinhas } from '../lib/executar.mjs';
import { escreverJson } from '../lib/json.mjs';
import { RECORTE, MASTER } from '../lib/regras.mjs';
import { cenasSoParaMedir, trechosDoRecorte, conferirRecortes, assinaturaDoTake, arquivosDoTrecho, lerManifesto, MANIFESTO, AMOSTRA_ALFA, pessoaNoAlfa, pessoaComTrilha, PASSO_DA_TRILHA, PESSOA_PADRAO } from '../lib/recorte.mjs';

// A pessoa a cada PASSO_DA_TRILHA quadros (0,5 s), para efeitos que acompanham a cabeça.
async function medirTrilha(video, temp, id) {
  const bruto = path.join(temp, `${id}-trilha.raw`);
  const { largura, altura } = AMOSTRA_ALFA;
  await ffmpegOk(['-y', '-c:v', 'libvpx-vp9', '-i', video, '-vf', `select=not(mod(n\\,${PASSO_DA_TRILHA})),alphaextract,scale=${largura}:${altura}`, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'gray', bruto]);
  const bytes = fs.readFileSync(bruto);
  fs.rmSync(bruto, { force: true });
  return pessoaComTrilha(bytes, MASTER.fps);
}

const { largura: LARGURA, altura: ALTURA } = MASTER;

// Lê o canal de transparência de um quadro (decodificador libvpx: o nativo descarta o alfa).
// Quadro sem ninguém: lugar típico com "medida": false (o montar avisa).
async function medirPessoa(video, temp, id, quadro = 0) {
  const bruto = path.join(temp, `${id}-alfa.raw`);
  const { largura, altura } = AMOSTRA_ALFA;
  await ffmpegOk(['-y', '-c:v', 'libvpx-vp9', '-i', video, '-vf', `trim=start_frame=${quadro}:end_frame=${quadro + 1},alphaextract,scale=${largura}:${altura}`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', bruto]);
  const alfa = fs.readFileSync(bruto);
  fs.rmSync(bruto, { force: true });
  const achada = pessoaNoAlfa(alfa);
  return achada ? { ...achada, medida: true } : { ...PESSOA_PADRAO, medida: false };
}

// Corta o trecho do take no quadro exato, sem som. Devolve os quadros que saíram de verdade: se o
// pedaço vier menor que o pedido, a máscara das cenas seguintes sairia fora do tempo, então reprova.
async function cortarPedaco(take, trecho, destino, escala) {
  const quadros = Math.round((trecho.fim - trecho.inicio) * MASTER.fps);
  const filtro = escala ? [`fps=${MASTER.fps}`, `scale=${escala}`].join(',') : `fps=${MASTER.fps}`;
  await ffmpegOk(['-y', '-ss', String(trecho.inicio), '-i', take, '-frames:v', String(quadros), '-an', '-vf', filtro, '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', destino]);
  const saiu = await contarQuadros(destino);
  if (saiu !== quadros) falha('RECORTE_DESALINHADO', { detalhe: `cena ${trecho.id}: ${saiu} quadros, esperado ${quadros}` });
  return quadros;
}

// Grava num arquivo ao lado e só troca o definitivo quando o ffmpeg termina: arquivo pela metade
// nunca fica com o nome de pronto.
async function gravarNoLugar(destino, gravar) {
  const parcial = `${destino}.parcial${path.extname(destino)}`;
  try {
    await gravar(parcial);
    fs.renameSync(parcial, destino);
  } finally {
    fs.rmSync(parcial, { force: true });
  }
}

export default async function recortar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const { dados, avisos } = conferirTabela(projeto);
  const take = exigirArquivo(projeto.arq('take.mp4'));
  const pasta = projeto.arq(RECORTE.pasta);
  const extras = typeof opcoes.cenas === 'string' ? opcoes.cenas.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const desconhecidas = extras.filter((id) => !dados.cenas.some((c) => c.id === id));
  if (desconhecidas.length) falha('ARGUMENTO_INVALIDO', { argumento: '--cenas', valor: desconhecidas.join(','), opcoes: dados.cenas.map((c) => c.id) });
  const trechos = trechosDoRecorte(dados.cenas, extras);
  if (!trechos.length) return { ok: true, resumo: 'Nenhuma cena pede recorte. Nada a fazer.', avisos, dados: { recortados: [], prontos: [] } };
  const duracaoDoTake = Number((await sondar(take)).format?.duration);
  if (!Number.isFinite(duracaoDoTake)) falha('VIDEO_NAO_LIDO', { detalhe: 'o take não informa a duração' });
  const fora = trechos.find((t) => t.fim > duracaoDoTake + 0.5 / MASTER.fps);
  if (fora) falha('RECORTE_FORA_DO_TAKE', { cena: fora.id, fim: fora.fim, duracao_do_take: Math.round(duracaoDoTake * 1000) / 1000 });
  fs.mkdirSync(pasta, { recursive: true });
  const assinatura = assinaturaDoTake(take);
  const { faltando } = conferirRecortes(projeto.pasta, dados.cenas, assinatura);
  const anotados = lerManifesto(pasta);
  const pronto = (t) => anotados.take === assinatura && anotados.trechos && anotados.trechos[t.id] && Math.abs(anotados.trechos[t.id].inicio - t.inicio) < 1e-3 && Math.abs(anotados.trechos[t.id].fim - t.fim) < 1e-3 && fs.existsSync(arquivosDoTrecho(pasta, t.id).video);
  const fazer = trechos.filter((t) => opcoes.tudo || faltando.includes(t.id) || !pronto(t));
  // Efeito sem recorte também mira no rosto: mede a pessoa num quadro só, na mesma carga do modelo.
  const medidas = anotados.take === assinatura ? anotados.pessoas || {} : {};
  const medir = cenasSoParaMedir(dados.cenas, trechos).filter((t) => opcoes.tudo || !medidas[t.id] || Math.abs(medidas[t.id].inicio - t.inicio) > 1e-3);
  const antigo = lerManifesto(pasta);
  let manifesto = { take: assinatura, trechos: antigo.take === assinatura ? { ...antigo.trechos } : {}, pessoas: antigo.take === assinatura ? { ...(antigo.pessoas || {}) } : {} };
  if (!fazer.length && !medir.length) return { ok: true, resumo: 'Os recortes já estavam prontos.', avisos, arquivos: { recorte: projeto.rel(RECORTE.pasta) }, dados: { recortados: [], prontos: trechos.map((t) => t.id) } };

  const inicio = Date.now();
  const temp = path.join(pasta, 'temp');
  fs.rmSync(temp, { recursive: true, force: true });
  fs.mkdirSync(temp, { recursive: true });
  try {
    progresso(`Preparando ${fazer.length} cena(s) para o recorte...`);
    const pedacos = [];
    let quadro = 0;
    for (const t of fazer) {
      const grande = path.join(temp, `${t.id}.mp4`);
      const pequeno = path.join(temp, `${t.id}-540.mp4`);
      const quadros = await cortarPedaco(take, t, grande, null);
      await cortarPedaco(take, t, pequeno, `${LARGURA / 2}:${ALTURA / 2}`);
      pedacos.push({ ...t, grande, pequeno, de: quadro, ate: quadro + quadros });
      quadro += quadros;
    }
    const soMedir = [];
    for (const t of medir) {
      const pequeno = path.join(temp, `${t.id}-medir.mp4`);
      await cortarPedaco(take, { ...t, fim: t.inicio + 1 / MASTER.fps }, pequeno, `${LARGURA / 2}:${ALTURA / 2}`);
      soMedir.push({ ...t, pequeno, de: quadro });
      quadro += 1;
    }
    // um vídeo só com todas as cenas, para o modelo carregar uma vez
    const lista = path.join(temp, 'lista.txt');
    fs.writeFileSync(lista, [...pedacos, ...soMedir].map((p) => `file '${path.basename(p.pequeno)}'`).join('\n'));
    const junto = path.join(temp, 'junto.mp4');
    await ffmpegOk(['-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', junto]);
    progresso(`Recortando a pessoa (${Math.round(quadro / MASTER.fps)} s de vídeo; leva alguns minutos)...`);
    const mascara = path.join(temp, 'junto.webm');
    const r = await hyperframes(['remove-background', junto, '-o', mascara, '--quality', 'fast'], { timeoutMs: 2 * 60 * 60 * 1000 });
    if (r.codigo !== 0 || !fs.existsSync(mascara)) falha('RECORTE_FALHOU', { detalhe: ultimasLinhas(`${r.saida}\n${r.erro}`, 8) });
    const naMascara = await contarQuadros(mascara);
    if (naMascara !== quadro) falha('RECORTE_DESALINHADO', { detalhe: `a máscara tem ${naMascara} quadros, esperado ${quadro}` });

    for (const p of pedacos) {
      progresso(`Aplicando o recorte na cena ${p.id}...`);
      const arq = arquivosDoTrecho(pasta, p.id);
      // antes de sobrescrever, a cena sai do manifesto: se parar no meio, ela fica "faltando", nunca "pronta"
      manifesto = { ...manifesto, trechos: Object.fromEntries(Object.entries(manifesto.trechos).filter(([id]) => id !== p.id)) };
      escreverJson(path.join(pasta, MANIFESTO), manifesto);
      const filtro = `[1:v]trim=start_frame=${p.de}:end_frame=${p.ate},setpts=PTS-STARTPTS,alphaextract,scale=${LARGURA}:${ALTURA}:flags=bicubic[a];[0:v][a]alphamerge,format=yuva420p`;
      await gravarNoLugar(arq.video, (saida) => ffmpegOk(['-y', '-i', p.grande, '-c:v', 'libvpx-vp9', '-i', mascara, '-filter_complex', filtro, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-crf', String(RECORTE.crf), '-b:v', '0', '-an', saida]));
      await gravarNoLugar(arq.foto, (saida) => ffmpegOk(['-y', '-i', p.grande, '-frames:v', '1', saida]));
      // o primeiro quadro com a pessoa vazada (transparente), um pouco alargada para não sobrar borda
      await gravarNoLugar(arq.fundo, (saida) => ffmpegOk(['-y', '-i', arq.foto, '-c:v', 'libvpx-vp9', '-i', arq.video, '-filter_complex', '[1:v]trim=end_frame=1,alphaextract,dilation,dilation,dilation,negate[a];[0:v][a]alphamerge', '-frames:v', '1', saida]));
      const pessoa = await medirTrilha(arq.video, temp, p.id);
      manifesto = { ...manifesto, trechos: { ...manifesto.trechos, [p.id]: { inicio: p.inicio, fim: p.fim, pessoa } } };
      escreverJson(path.join(pasta, MANIFESTO), manifesto);
    }
    for (const m of soMedir) {
      const pessoa = await medirPessoa(mascara, temp, m.id, m.de);
      manifesto = { ...manifesto, pessoas: { ...manifesto.pessoas, [m.id]: { inicio: m.inicio, pessoa } } };
    }
    escreverJson(path.join(pasta, MANIFESTO), manifesto);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  const segundos = Math.round((Date.now() - inicio) / 1000);
  return {
    ok: true,
    resumo: `Pessoa recortada em ${fazer.length} cena(s)${medir.length ? ` e medida em mais ${medir.length}` : ''}, em ${segundos} s.`,
    avisos,
    arquivos: { recorte: projeto.rel(RECORTE.pasta) },
    dados: { recortados: fazer.map((t) => t.id), prontos: trechos.map((t) => t.id), segundos },
  };
}
