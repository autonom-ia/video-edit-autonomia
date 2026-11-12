// Referências: baixa os exemplos e links na máquina do aluno e gera a nota técnica de cada vídeo.
// Só lê o que é público; nunca pede senha; nada de terceiro entra no repositório.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS, FERR, binario, relativoARaiz } from '../lib/caminhos.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { rodar, ultimasLinhas, progresso } from '../lib/executar.mjs';
import { ffmpeg, sondar, resumoDoVideo, loudness, temposComDoisPontos } from '../lib/ffmpeg.mjs';
import { folhaDeQuadros } from '../lib/chrome.mjs';
import { earshot, earshotDisponivel } from '../lib/earshot.mjs';
import { slug, hoje, arred } from '../lib/texto.mjs';
import { VIDEO } from '../lib/regras.mjs';
import { validarCom } from '../lib/validar.mjs';

const ehVideo = (nome) => VIDEO.extensoes.some((e) => nome.toLowerCase().endsWith(e)) || nome.toLowerCase().endsWith('.webm');

async function baixarUm(url, pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const conf = path.join(FERR, 'yt-dlp.conf');
  const args = ['--no-playlist', '--no-progress', '--max-filesize', '300M', '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', '--merge-output-format', 'mp4', '-o', path.join(pasta, 'video.%(ext)s')];
  if (fs.existsSync(conf)) args.unshift('--config-locations', conf);
  const r = await rodar(binario('yt-dlp'), [...args, url], { timeoutMs: 15 * 60 * 1000 });
  if (r.naoAchou) falha('FERRAMENTA_FALTANDO', { ferramenta: 'yt-dlp' });
  const baixado = fs.existsSync(pasta) ? fs.readdirSync(pasta).find((n) => n.startsWith('video.') && ehVideo(n)) : null;
  if (r.codigo === 0 && baixado) return { ok: true, arquivo: path.join(pasta, baixado) };
  const texto = `${r.erro}\n${r.saida}`.toLowerCase();
  const pedeLogin = ['login', 'log in', 'sign in', 'cookies', 'private', 'privad'].some((p) => texto.includes(p));
  return { ok: false, pedeLogin, detalhe: ultimasLinhas(r.erro, 4) };
}

async function baixarExemplos() {
  const links = lerJson(path.join(PASTAS.referencias, 'links.json'), { versao: 1, exemplos: [] });
  const erros = validarCom('links', links);
  if (erros.length) falha('ARQUIVO_INVALIDO', { arquivo: '1-referencias/links.json', problemas: erros.slice(0, 5) });
  const avisos = [];
  let baixados = 0;
  let jaTinha = 0;
  for (const ex of links.exemplos) {
    const pasta = path.join(PASTAS.referencias, ex.slug);
    if (fs.existsSync(pasta) && fs.readdirSync(pasta).some((n) => n.startsWith('video.'))) {
      jaTinha += 1;
      continue;
    }
    progresso(`Baixando exemplo ${ex.slug}...`);
    const r = await baixarUm(ex.url, pasta);
    if (r.ok) {
      baixados += 1;
      escreverJson(path.join(pasta, 'origem.json'), { url: ex.url, o_que_observar: ex.o_que_observar || '', baixado_em: hoje() });
    } else {
      avisos.push(aviso(r.pedeLogin ? 'PEDE_LOGIN' : 'DOWNLOAD_REFERENCIA_FALHOU', { slug: ex.slug, detalhe: r.detalhe }));
    }
  }
  return { ok: true, resumo: `Baixei ${baixados} exemplo(s). ${jaTinha} já estavam na pasta.`, avisos, arquivos: { pasta: '1-referencias' }, dados: { baixados, ja_tinha: jaTinha, total: links.exemplos.length } };
}

async function baixarLink(url) {
  if (!(url.startsWith('https://') || url.startsWith('http://'))) falha('ARGUMENTO_INVALIDO', { argumento: '--baixar', valor: url });
  let nome = `ref-${hoje()}`;
  let n = 1;
  while (fs.existsSync(path.join(PASTAS.referencias, `${nome}-${n}`))) n += 1;
  nome = `${nome}-${n}`;
  const pasta = path.join(PASTAS.referencias, nome);
  const r = await baixarUm(url, pasta);
  if (!r.ok) {
    if (fs.existsSync(pasta) && fs.readdirSync(pasta).length === 0) fs.rmdirSync(pasta);
    return { ok: true, resumo: 'Não consegui baixar esse vídeo.', avisos: [aviso(r.pedeLogin ? 'PEDE_LOGIN' : 'DOWNLOAD_REFERENCIA_FALHOU', { url, detalhe: r.detalhe })], dados: { baixado: false } };
  }
  escreverJson(path.join(pasta, 'origem.json'), { url, baixado_em: hoje() });
  return { ok: true, resumo: 'Baixei o vídeo de referência.', arquivos: { pasta: relativoARaiz(pasta) }, dados: { baixado: true, pasta: nome } };
}

// Vídeos soltos na pasta 1-referencias ganham uma pasta própria.
function organizarSoltos() {
  if (!fs.existsSync(PASTAS.referencias)) return;
  for (const nome of fs.readdirSync(PASTAS.referencias)) {
    const caminho = path.join(PASTAS.referencias, nome);
    if (!fs.statSync(caminho).isFile() || !ehVideo(nome)) continue;
    const ext = path.extname(nome).toLowerCase();
    let destino = path.join(PASTAS.referencias, slug(path.basename(nome, path.extname(nome))));
    let n = 2;
    while (fs.existsSync(destino)) destino = path.join(PASTAS.referencias, `${slug(path.basename(nome, path.extname(nome)))}-${n++}`);
    fs.mkdirSync(destino, { recursive: true });
    fs.renameSync(caminho, path.join(destino, `video${ext}`));
  }
}

async function estudarPasta(pasta) {
  const video = fs.readdirSync(pasta).find((n) => n.startsWith('video.') && ehVideo(n));
  if (!video) return null;
  const arquivo = path.join(pasta, video);
  const info = resumoDoVideo(await sondar(arquivo));
  const quadros = path.join(pasta, 'quadros');
  fs.rmSync(quadros, { recursive: true, force: true });
  fs.mkdirSync(quadros, { recursive: true });
  await ffmpeg(['-y', '-i', arquivo, '-vf', 'fps=1,scale=360:-2', '-q:v', '4', path.join(quadros, 'q-%03d.jpg')]);
  const lista = fs.readdirSync(quadros).filter((n) => n.endsWith('.jpg')).sort();
  const escolhidos = [];
  const quantos = Math.min(16, lista.length);
  for (let i = 0; i < quantos; i += 1) escolhidos.push(lista[Math.floor((i * lista.length) / quantos)]);
  if (escolhidos.length) {
    await folhaDeQuadros(escolhidos.map((n) => path.join(quadros, n)), path.join(pasta, 'folha-de-quadros.jpg'), {
      colunas: 4,
      rotulos: escolhidos.map((n) => `${Number(n.slice(2, 5)) - 1} s`),
    });
  }
  const cenas = await ffmpeg(['-nostats', '-i', arquivo, '-vf', "select='gt(scene,0.3)',showinfo", '-map', '0:v:0', '-f', 'null', '-']);
  const cortes = temposComDoisPontos(cenas.erro, 'pts_time');
  let som = { lufs: null };
  if (info.tem_audio) som = await loudness(arquivo);
  const nota = {
    duracao_s: info.duracao,
    largura: info.largura,
    altura: info.altura,
    fps: info.fps,
    cortes: cortes.length,
    cortes_por_10s: info.duracao ? arred((cortes.length / info.duracao) * 10, 1) : 0,
    tempos_dos_cortes: cortes.map((t) => arred(t, 2)),
    lufs: som.lufs,
    ouvido: null,
  };
  if (earshotDisponivel() && info.tem_audio) {
    const r = await earshot('critique', [arquivo, '--fast']);
    if (r.disponivel && r.codigo === 0) {
      const destino = path.join(pasta, 'ouvido');
      fs.mkdirSync(destino, { recursive: true });
      fs.writeFileSync(path.join(destino, 'critique.txt'), r.saida, 'utf8');
      nota.ouvido = 'ouvido/critique.txt';
    }
  }
  escreverJson(path.join(pasta, 'nota-tecnica.json'), nota);
  return nota;
}

async function estudar(alvo) {
  organizarSoltos();
  const pastas = [];
  if (alvo === 'todas') {
    for (const nome of fs.existsSync(PASTAS.referencias) ? fs.readdirSync(PASTAS.referencias) : []) {
      const c = path.join(PASTAS.referencias, nome);
      if (fs.statSync(c).isDirectory()) pastas.push(c);
    }
  } else {
    const c = path.join(PASTAS.referencias, path.basename(alvo));
    if (!fs.existsSync(c)) falha('ARQUIVO_NAO_ACHADO', { arquivo: `1-referencias/${path.basename(alvo)}` });
    pastas.push(c);
  }
  const estudadas = [];
  for (const p of pastas) {
    progresso(`Estudando ${path.basename(p)}...`);
    const nota = await estudarPasta(p);
    if (nota) estudadas.push({ pasta: path.basename(p), nota: relativoARaiz(path.join(p, 'nota-tecnica.json')), folha: relativoARaiz(path.join(p, 'folha-de-quadros.jpg')), tem_regua: fs.existsSync(path.join(p, 'regua.md')) });
  }
  const avisos = estudadas.length ? [] : [aviso('SEM_REFERENCIAS', {})];
  return { ok: true, resumo: `Estudei ${estudadas.length} vídeo(s) de referência.`, avisos, arquivos: { pasta: '1-referencias' }, dados: { estudadas } };
}

export default async function referencias({ opcoes }) {
  if (opcoes['baixar-exemplos']) return baixarExemplos();
  if (typeof opcoes.baixar === 'string') return baixarLink(opcoes.baixar);
  if (typeof opcoes.estudar === 'string') return estudar(opcoes.estudar);
  falha('ARGUMENTO_FALTANDO', { argumento: '--baixar-exemplos | --baixar <link> | --estudar <pasta|todas>' });
  return null;
}
