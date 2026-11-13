// Fotografa momentos do vídeo (composição, prévia ou final) com a zona segura por cima e monta a folha.
import fs from 'node:fs';
import path from 'node:path';
import { KIT, FERR } from '../lib/caminhos.mjs';
import { abrirProjeto, exigirArquivo } from '../lib/projeto.mjs';
import { escolha } from '../lib/args.mjs';
import { lerJson } from '../lib/json.mjs';
import { falha } from '../lib/saida.mjs';
import { ffmpeg, ffmpegOk, sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { fotografar } from '../lib/hyperframes.mjs';
import { fotografarHtml, folhaDeQuadros } from '../lib/chrome.mjs';
import { arred } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';

const r2 = (n) => arred(n, 2);

export function momentos(cenas, duracao, tipo) {
  const lista = [];
  if (tipo === 'cada-segundo') {
    for (let t = 0; t < duracao; t += 1) lista.push({ t, rotulo: `${t} s` });
    return lista;
  }
  lista.push({ t: 0, rotulo: '0 s (capa)' });
  for (const c of cenas.cenas || []) lista.push({ t: r2((c.inicio + c.fim) / 2), rotulo: `${c.id} meio` });
  let faixa = null;
  for (const c of cenas.cenas || []) {
    if (faixa !== null && c.faixa !== faixa) lista.push({ t: r2(c.inicio + 0.3), rotulo: `${c.id} troca` });
    faixa = c.faixa;
  }
  for (const t of cenas.telas || []) lista.push({ t: r2(t.entra + 0.3), rotulo: `${t.id} entra` });
  // efeito de cena: a chegada e a saída, além do meio da cena
  for (const c of cenas.cenas || []) {
    if (!c.efeito) continue;
    lista.push({ t: r2(c.inicio + 0.25), rotulo: `${c.id} ${c.efeito.nome} entra` });
    lista.push({ t: r2(c.fim - 0.12), rotulo: `${c.id} ${c.efeito.nome} sai` });
  }
  const vistos = new Set();
  return lista
    .filter((m) => m.t >= 0 && m.t < duracao)
    .sort((a, b) => a.t - b.t)
    .filter((m) => {
      const chave = Math.round(m.t * 10);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

async function sobreposicao() {
  const png = path.join(FERR, 'cache', 'zona-segura.png');
  if (!fs.existsSync(png)) await fotografarHtml(path.join(KIT, 'molde', 'zona-segura.svg'), png, { transparente: true });
  return png;
}

export default async function quadros({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const fonte = escolha(opcoes, 'fonte', ['comp', 'previa', 'final']);
  const tipoMomentos = escolha(opcoes, 'momentos', ['cenas,transicoes', 'cada-segundo'], 'cenas,transicoes');
  const cenas = lerJson(exigirArquivo(projeto.arq('cenas.json')));
  const pasta = projeto.arq('quadros', fonte);
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });
  const brutos = path.join(pasta, 'brutos');
  fs.mkdirSync(brutos, { recursive: true });
  let duracao;
  const fotos = [];
  if (fonte === 'comp') {
    const comp = exigirArquivo(projeto.arq('comp', 'index.html'));
    duracao = resumoDoVideo(await sondar(exigirArquivo(projeto.arq('comp', 'assets', 'take.mp4')))).duracao;
    const lista = momentos(cenas, duracao, tipoMomentos);
    progresso(`Fotografando ${lista.length} momentos...`);
    await fotografar(path.dirname(comp), lista.map((m) => m.t), brutos);
    for (const m of lista) {
      const nome = `at-${String(Math.round(m.t * 1000) / 1000)}s.png`;
      const c = path.join(brutos, nome);
      if (fs.existsSync(c)) fotos.push({ ...m, arquivo: c });
    }
    if (!fotos.length) {
      const todas = fs.readdirSync(brutos).filter((n) => n.endsWith('.png')).sort();
      todas.forEach((n, i) => fotos.push({ ...(lista[i] || { t: i, rotulo: n }), arquivo: path.join(brutos, n) }));
    }
  } else {
    const video = exigirArquivo(projeto.arq(fonte === 'previa' ? 'previa.mp4' : 'final.mp4'));
    duracao = resumoDoVideo(await sondar(video)).duracao;
    const lista = momentos(cenas, duracao, tipoMomentos);
    for (const [i, m] of lista.entries()) {
      const c = path.join(brutos, `q-${String(i).padStart(3, '0')}.png`);
      const r = await ffmpeg(['-y', '-ss', String(m.t), '-i', video, '-frames:v', '1', c]);
      if (r.codigo === 0 && fs.existsSync(c)) fotos.push({ ...m, arquivo: c });
    }
  }
  if (!fotos.length) falha('CHROME_NAO_ABRIU', { detalhe: 'nenhum quadro saiu' });
  const zona = await sobreposicao();
  const finais = [];
  for (const [i, f] of fotos.entries()) {
    const destino = path.join(pasta, `${String(i).padStart(3, '0')}-${String(f.t).split('.').join('_')}s.png`);
    await ffmpegOk(['-y', '-i', f.arquivo, '-i', zona, '-filter_complex', '[0:v]scale=1080:1920[b];[1:v]scale=1080:1920[z];[b][z]overlay=0:0', '-frames:v', '1', destino]);
    finais.push({ ...f, arquivo: destino });
  }
  fs.rmSync(brutos, { recursive: true, force: true });
  const folha = projeto.arq('quadros', `folha-de-quadros-${fonte}.jpg`);
  await folhaDeQuadros(finais.map((f) => f.arquivo), folha, { colunas: 4, rotulos: finais.map((f) => f.rotulo) });
  return {
    ok: true,
    resumo: `${finais.length} quadros fotografados. Olhe a folha procurando tela branca, sobra, texto fora da zona segura e legenda sobre a boca.`,
    arquivos: { pasta: projeto.rel('quadros', fonte), folha: projeto.rel('quadros', `folha-de-quadros-${fonte}.jpg`) },
    dados: { quadros: finais.map((f) => ({ segundo: f.t, rotulo: f.rotulo, arquivo: projeto.rel('quadros', fonte, path.basename(f.arquivo)) })) },
  };
}
