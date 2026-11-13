// Monta a composição do Reel em projetos/<P>/comp/ a partir da tabela de cenas, da fala e da marca.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, KIT, daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, exigirArquivo, lerMarca, mudarEtapa, lerEstado } from '../lib/projeto.mjs';
import { lerJson, escreverJson, escreverTexto } from '../lib/json.mjs';
import { falha, reprovado, aviso } from '../lib/saida.mjs';
import { sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { montarComposicao, htmlDosSons, jsonParaScript } from '../lib/composicao.mjs';
import { estiloCss } from '../lib/amostra.mjs';
import { escaparHtml, preencher } from '../lib/texto.mjs';
import { conferirTabela } from './telas.mjs';
import { lerTelaDeArquivo, pluginsCitados, tipoDeMidia } from '../lib/telas-livres.mjs';
import { MIDIA, RITMO, RECORTE, FAIXA } from '../lib/regras.mjs';
import { lerRosto, legendaSugerida, conferirLegendaNoRosto, origemDoZoom } from '../lib/rosto.mjs';
import { arquivosDoEfeito } from '../lib/efeitos.mjs';
import { conferirRecortes, assinaturaDoTake, medidasDaPessoa, cenaForaDoTake } from '../lib/recorte.mjs';

// Tela que passa do fim do vídeo, ou gravação mais curta que o tempo da tela (congelaria).
export function conferirDuracoes(telas, duracaoVideo, duracaoDasMidias) {
  const depoisDoFim = telas.filter((t) => t.sai > duracaoVideo + 0.05).map((t) => ({ tela: t.id, sai: t.sai, fim_do_video: duracaoVideo }));
  const curtas = [];
  for (const t of telas) {
    const duracao = duracaoDasMidias[t.id];
    if (duracao === undefined) continue;
    const precisa = t.sai - Math.max(0, t.entra - RITMO.antecipacaoCardS);
    if (duracao < precisa - 0.1) curtas.push({ tela: t.id, gravacao_s: duracao, tela_s: Math.round(precisa * 100) / 100 });
  }
  return { depoisDoFim, curtas };
}

// Nomes entre {{ }} no molde.
export function marcadoresDoMolde(molde) {
  const nomes = [];
  let i = molde.indexOf('{{');
  while (i !== -1) {
    const fim = molde.indexOf('}}', i + 2);
    if (fim === -1) break;
    nomes.push(molde.slice(i + 2, fim));
    i = molde.indexOf('{{', fim + 2);
  }
  return nomes;
}

// Copia a pasta midia do projeto para comp/assets/midia (a tela livre usa assets/midia/<nome>).
function copiarMidias(projeto, assets) {
  const origem = projeto.arq(MIDIA.pasta);
  if (!fs.existsSync(origem)) return;
  const destino = path.join(assets, 'midia');
  fs.rmSync(destino, { recursive: true, force: true });
  const copiar = (de, para) => {
    fs.mkdirSync(para, { recursive: true });
    for (const nome of fs.readdirSync(de)) {
      const c = path.join(de, nome);
      const st = fs.lstatSync(c);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) copiar(c, path.join(para, nome));
      else copiarOuLigar(c, path.join(para, nome));
    }
  };
  copiar(origem, destino);
}

// Lê as telas livres e as mídias da tabela. Devolve o HTML de cada tela livre, o endereço de
// cada mídia dentro da composição e os plugins do GSAP citados.
function telasDeArquivo(dados, projeto) {
  const livres = {};
  const midias = {};
  const plugins = new Set();
  for (const tela of dados.telas || []) {
    if (tela.tipo !== 'livre' && tela.tipo !== 'midia') continue;
    const lido = lerTelaDeArquivo(tela, projeto.pasta);
    if (tela.tipo === 'livre') {
      livres[tela.id] = lido.conteudo || '';
      pluginsCitados(livres[tela.id]).forEach((nome) => plugins.add(nome));
    } else {
      const relativo = path.relative(projeto.arq(MIDIA.pasta), lido.caminho).split(path.sep).join('/');
      const dentroDaMidia = !relativo.startsWith('..');
      midias[tela.id] = { src: dentroDaMidia ? `assets/midia/${relativo}` : '', tipo: tipoDeMidia(lido.caminho), fora: !dentroDaMidia, arquivo: tela.campos.arquivo };
    }
  }
  return { livres, midias, plugins: [...plugins] };
}

function copiarOuLigar(origem, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  if (fs.existsSync(destino)) fs.rmSync(destino);
  try {
    fs.linkSync(origem, destino);
  } catch {
    fs.copyFileSync(origem, destino);
  }
}

// Recortes prontos das cenas que pedem recorte. Faltando ou velho: reprova com a ação de recortar.
function copiarRecortes(projeto, dados, take, assets) {
  const { faltando, prontos } = conferirRecortes(projeto.pasta, dados.cenas, assinaturaDoTake(take));
  if (faltando.length) reprovado('RECORTE_FALTANDO', { cenas: faltando });
  const destino = path.join(assets, RECORTE.pasta);
  fs.rmSync(destino, { recursive: true, force: true });
  const recortes = {};
  for (const r of prontos) {
    copiarOuLigar(r.video, path.join(destino, `${r.id}.webm`));
    copiarOuLigar(r.foto, path.join(destino, `${r.id}.png`));
    copiarOuLigar(r.fundo, path.join(destino, `${r.id}-fundo.png`));
    recortes[r.id] = { pessoa: r.pessoa };
  }
  return recortes;
}

// Copia o .js e o .css dos efeitos usados para comp/efeitos e devolve as tags para o molde.
function copiarEfeitos(efeitosInfo, comp) {
  const pasta = path.join(comp, 'efeitos');
  fs.rmSync(pasta, { recursive: true, force: true });
  const tags = [];
  for (const nome of new Set(efeitosInfo.map((e) => e.nome))) {
    const arq = arquivosDoEfeito(nome);
    if (!arq.js) falha('EFEITO_FALTANDO', { efeito: nome });
    fs.mkdirSync(pasta, { recursive: true });
    if (arq.css) {
      fs.copyFileSync(arq.css, path.join(pasta, `${nome}.css`));
      tags.push(`    <link rel="stylesheet" href="efeitos/${nome}.css" />`);
    }
    fs.copyFileSync(arq.js, path.join(pasta, `${nome}.js`));
    tags.push(`    <script src="efeitos/${nome}.js"></script>`);
  }
  return tags.join('\n');
}

// Altura da legenda com o rosto cheio: a do cenas.json, senão a sugerida pela medida do rosto.
// Legenda entre os olhos e o lábio reprova; sem lugar bom em lugar nenhum, só avisa.
function legendaComRosto(dados, resumo, avisos) {
  const sugerida = legendaSugerida(resumo);
  const y = dados.legenda_rosto_y ?? sugerida ?? FAIXA.legendaY[0];
  const problema = conferirLegendaNoRosto(y, resumo);
  if (problema && problema.sugerida !== null) reprovado('LEGENDA_NA_BOCA', problema);
  if (problema) avisos.push(aviso('LEGENDA_SEM_LUGAR', problema));
  return y;
}

export default async function montar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const marca = lerMarca();
  const { dados, avisos } = conferirTabela(projeto);
  const transcricao = lerJson(exigirArquivo(projeto.arq('transcricao.json')));
  const take = exigirArquivo(projeto.arq('take.mp4'));
  const info = resumoDoVideo(await sondar(take));
  const foraDoTake = cenaForaDoTake(dados.cenas, [], info.duracao);
  if (foraDoTake) falha('EFEITO_FORA_DO_TAKE', foraDoTake);
  const gsap = path.join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.min.js');
  if (!fs.existsSync(gsap)) falha('MONTADOR_FALTANDO', { detalhe: 'gsap' });

  const comp = projeto.arq('comp');
  const assets = path.join(comp, 'assets');
  fs.mkdirSync(path.join(assets, 'sfx'), { recursive: true });
  copiarOuLigar(take, path.join(assets, 'take.mp4'));
  fs.copyFileSync(gsap, path.join(assets, 'gsap.min.js'));

  const fontesUsadas = new Map();
  for (const papel of ['titulo', 'leitura']) {
    const f = marca.fontes[papel];
    if (!f.arquivo) continue;
    const origem = daRaiz(f.arquivo);
    if (!fs.existsSync(origem)) falha('ARQUIVO_NAO_ACHADO', { arquivo: f.arquivo });
    const nome = path.basename(origem);
    fs.mkdirSync(path.join(assets, 'fontes'), { recursive: true });
    fs.copyFileSync(origem, path.join(assets, 'fontes', nome));
    fontesUsadas.set(f.arquivo, `assets/fontes/${nome}`);
  }

  const deArquivo = telasDeArquivo(dados, projeto);
  const foraDaMidia = Object.values(deArquivo.midias).filter((m) => m.fora);
  if (foraDaMidia.length) falha('MIDIA_FORA_DA_PASTA', { arquivos: foraDaMidia.map((m) => m.arquivo) });
  const duracaoDasMidias = {};
  for (const tela of dados.telas || []) {
    const m = deArquivo.midias[tela.id];
    if (m && m.tipo === 'video') duracaoDasMidias[tela.id] = resumoDoVideo(await sondar(lerTelaDeArquivo(tela, projeto.pasta).caminho)).duracao;
  }
  const duracoes = conferirDuracoes(dados.telas || [], info.duracao, duracaoDasMidias);
  if (duracoes.depoisDoFim.length) reprovado('TELA_DEPOIS_DO_FIM', { problemas: duracoes.depoisDoFim });
  if (duracoes.curtas.length) reprovado('MIDIA_CURTA', { problemas: duracoes.curtas });
  copiarMidias(projeto, assets);
  const scriptsDePlugin = [];
  for (const nome of deArquivo.plugins) {
    const arquivo = path.join(RAIZ, 'node_modules', 'gsap', 'dist', `${nome}.min.js`);
    if (!fs.existsSync(arquivo)) falha('MONTADOR_FALTANDO', { detalhe: `gsap ${nome}` });
    fs.mkdirSync(path.join(assets, 'gsap'), { recursive: true });
    fs.copyFileSync(arquivo, path.join(assets, 'gsap', `${nome}.min.js`));
    scriptsDePlugin.push(`    <script src="assets/gsap/${nome}.min.js"></script>`);
  }

  const recortes = copiarRecortes(projeto, dados, take, assets);
  const medidas = medidasDaPessoa(projeto.arq(RECORTE.pasta), assinaturaDoTake(take));
  const rosto = lerRosto(projeto.arq('rosto.json'), assinaturaDoTake(take));
  const avisosDoRosto = rosto ? [] : [aviso('ROSTO_NAO_MEDIDO', { onde: 'montar', detalhe: 'sem rosto.json deste take (rode ./estudio cortar de novo)' })];
  const legendaRostoY = legendaComRosto(dados, rosto?.resumo, avisosDoRosto);
  const zoomOrigem = origemDoZoom(rosto?.resumo);
  const montagem = montarComposicao({ dados, transcricao, marca, duracao: info.duracao, livres: deArquivo.livres, midias: deArquivo.midias, recortes, medidas, legendaRostoY, zoomOrigem });
  const tagsDeEfeito = copiarEfeitos(montagem.efeitos.info, comp);
  const semMedida = montagem.efeitos.info.filter((e) => e.pessoa && e.pessoa.medida === false).map((e) => e.id);
  const avisosDoMontar = [...avisos, ...avisosDoRosto, ...(semMedida.length ? [aviso('EFEITO_SEM_MEDIDA', { cenas: semMedida })] : [])];
  for (const efeito of new Set(montagem.sons.map((s) => s.efeito))) {
    fs.copyFileSync(path.join(KIT, 'sfx', `${efeito}.wav`), path.join(assets, 'sfx', `${efeito}.wav`));
  }

  escreverTexto(path.join(comp, 'estilo.css'), estiloCss(marca, (rel) => fontesUsadas.get(rel) || rel));
  fs.copyFileSync(path.join(KIT, 'molde', 'reel', 'animacao.js'), path.join(comp, 'animacao.js'));
  fs.copyFileSync(path.join(KIT, 'molde', 'reel', 'hyperframes.json'), path.join(comp, 'hyperframes.json'));
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'reel', 'index.tpl.html'), 'utf8');
  // As telas entram por último: o HTML delas é do assistente e pode ter "{{" no meio.
  const trocas = {
    TITULO: escaparHtml(lerEstado(projeto).titulo || projeto.nome),
    DURACAO: String(montagem.dadosReel.duracao),
    GANCHO_FIM: String(montagem.gancho.fim),
    GANCHO: montagem.gancho.html,
    CTA: montagem.cta.html,
    LEGENDAS: montagem.legendas.html,
    SONS: htmlDosSons(montagem.sons),
    DADOS: jsonParaScript(montagem.dadosReel),
    PLUGINS: scriptsDePlugin.join('\n'),
    MIDIAS: montagem.telas.htmlMidias,
    EF_FUNDO: montagem.efeitos.htmlFundo,
    EF_ATRAS: montagem.efeitos.htmlAtras,
    EF_FRENTE: montagem.efeitos.htmlFrente,
    RECORTES: montagem.efeitos.htmlRecortes,
    SERIE: montagem.serie.html,
    EFEITOS: tagsDeEfeito,
    TELAS: montagem.telas.html,
  };
  const faltando = Object.keys(trocas).filter((chave) => !molde.includes(`{{${chave}}}`));
  const semTroca = marcadoresDoMolde(molde).filter((chave) => trocas[chave] === undefined);
  if (faltando.length || semTroca.length) falha('MOLDE_INCOMPLETO', { faltando: [...faltando, ...semTroca] });
  const html = preencher(molde, trocas);
  escreverTexto(path.join(comp, 'index.html'), html);
  escreverJson(path.join(comp, 'sons.json'), montagem.sons);
  escreverJson(path.join(comp, 'legendas.json'), montagem.legendas.arquivo);
  mudarEtapa(projeto, 'montagem');
  return {
    ok: true,
    resumo: `Vídeo montado: ${montagem.legendas.dados.length} legendas, ${(dados.telas || []).length} telas, ${montagem.sons.length} sons.`,
    avisos: avisosDoMontar,
    arquivos: { comp: projeto.rel('comp'), index: projeto.rel('comp', 'index.html'), sons: projeto.rel('comp', 'sons.json'), legendas: projeto.rel('comp', 'legendas.json') },
    dados: { duracao_s: info.duracao, legendas: montagem.legendas.dados.length, telas: (dados.telas || []).length, sons: montagem.sons.length },
  };
}
