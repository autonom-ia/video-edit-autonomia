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
import { ffmpegOk } from '../lib/ffmpeg.mjs';
import { hyperframes } from '../lib/hyperframes.mjs';
import { falha } from '../lib/saida.mjs';
import { progresso, ultimasLinhas } from '../lib/executar.mjs';
import { escreverJson } from '../lib/json.mjs';
import { RECORTE, MASTER } from '../lib/regras.mjs';
import { trechosDoRecorte, conferirRecortes, assinaturaDoTake, arquivosDoTrecho, lerManifesto, MANIFESTO, AMOSTRA_ALFA, pessoaNoAlfa } from '../lib/recorte.mjs';

const { largura: LARGURA, altura: ALTURA } = MASTER;

// Lê o canal de transparência do primeiro quadro (decodificador libvpx: o nativo descarta o alfa).
async function medirPessoa(video, pasta, id) {
  const bruto = path.join(pasta, `${id}-alfa.raw`);
  const { largura, altura } = AMOSTRA_ALFA;
  await ffmpegOk(['-y', '-c:v', 'libvpx-vp9', '-i', video, '-frames:v', '1', '-vf', `alphaextract,scale=${largura}:${altura}`, '-f', 'rawvideo', '-pix_fmt', 'gray', bruto]);
  const alfa = fs.readFileSync(bruto);
  fs.rmSync(bruto, { force: true });
  return pessoaNoAlfa(alfa);
}

// Corta o trecho do take no quadro exato, com o número certo de quadros, sem som.
async function cortarPedaco(take, trecho, destino, escala) {
  const quadros = Math.round((trecho.fim - trecho.inicio) * MASTER.fps);
  const filtro = escala ? [`fps=${MASTER.fps}`, `scale=${escala}`].join(',') : `fps=${MASTER.fps}`;
  await ffmpegOk(['-y', '-ss', String(trecho.inicio), '-i', take, '-frames:v', String(quadros), '-an', '-vf', filtro, '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', destino]);
  return quadros;
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
  fs.mkdirSync(pasta, { recursive: true });
  const assinatura = assinaturaDoTake(take);
  const { faltando } = conferirRecortes(projeto.pasta, dados.cenas, assinatura);
  const anotados = lerManifesto(pasta);
  const pronto = (t) => anotados.take === assinatura && anotados.trechos && anotados.trechos[t.id] && Math.abs(anotados.trechos[t.id].inicio - t.inicio) < 1e-3 && Math.abs(anotados.trechos[t.id].fim - t.fim) < 1e-3 && fs.existsSync(arquivosDoTrecho(pasta, t.id).video);
  const fazer = trechos.filter((t) => opcoes.tudo || faltando.includes(t.id) || !pronto(t));
  const antigo = lerManifesto(pasta);
  let manifesto = { take: assinatura, trechos: antigo.take === assinatura ? { ...antigo.trechos } : {} };
  if (!fazer.length) return { ok: true, resumo: 'Os recortes já estavam prontos.', avisos, arquivos: { recorte: projeto.rel(RECORTE.pasta) }, dados: { recortados: [], prontos: trechos.map((t) => t.id) } };

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
    // um vídeo só com todas as cenas, para o modelo carregar uma vez
    const lista = path.join(temp, 'lista.txt');
    fs.writeFileSync(lista, pedacos.map((p) => `file '${path.basename(p.pequeno)}'`).join('\n'));
    const junto = path.join(temp, 'junto.mp4');
    await ffmpegOk(['-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', junto]);
    progresso(`Recortando a pessoa (${Math.round(quadro / MASTER.fps)} s de vídeo; leva alguns minutos)...`);
    const mascara = path.join(temp, 'junto.webm');
    const r = await hyperframes(['remove-background', junto, '-o', mascara, '--quality', 'fast'], { timeoutMs: 2 * 60 * 60 * 1000 });
    if (r.codigo !== 0 || !fs.existsSync(mascara)) falha('RECORTE_FALHOU', { detalhe: ultimasLinhas(`${r.saida}\n${r.erro}`, 8) });

    for (const p of pedacos) {
      progresso(`Aplicando o recorte na cena ${p.id}...`);
      const arq = arquivosDoTrecho(pasta, p.id);
      const filtro = `[1:v]trim=start_frame=${p.de}:end_frame=${p.ate},setpts=PTS-STARTPTS,alphaextract,scale=${LARGURA}:${ALTURA}:flags=bicubic[a];[0:v][a]alphamerge,format=yuva420p`;
      await ffmpegOk(['-y', '-i', p.grande, '-c:v', 'libvpx-vp9', '-i', mascara, '-filter_complex', filtro, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-crf', String(RECORTE.crf), '-b:v', '0', '-an', arq.video]);
      await ffmpegOk(['-y', '-i', p.grande, '-frames:v', '1', arq.foto]);
      const pessoa = await medirPessoa(arq.video, pasta, p.id);
      manifesto = { ...manifesto, trechos: { ...manifesto.trechos, [p.id]: { inicio: p.inicio, fim: p.fim, pessoa } } };
      escreverJson(path.join(pasta, MANIFESTO), manifesto);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  const segundos = Math.round((Date.now() - inicio) / 1000);
  return {
    ok: true,
    resumo: `Pessoa recortada em ${fazer.length} cena(s), em ${segundos} s.`,
    avisos,
    arquivos: { recorte: projeto.rel(RECORTE.pasta) },
    dados: { recortados: fazer.map((t) => t.id), prontos: trechos.map((t) => t.id), segundos },
  };
}
