// Monta a composição do Reel em projetos/<P>/comp/ a partir da tabela de cenas, da fala e da marca.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, KIT, daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, exigirArquivo, lerMarca, mudarEtapa, lerEstado } from '../lib/projeto.mjs';
import { lerJson, escreverJson, escreverTexto } from '../lib/json.mjs';
import { falha } from '../lib/saida.mjs';
import { sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { montarComposicao, htmlDosSons, jsonParaScript } from '../lib/composicao.mjs';
import { estiloCss } from '../lib/amostra.mjs';
import { escaparHtml, preencher } from '../lib/texto.mjs';
import { conferirTabela } from './telas.mjs';

function copiarOuLigar(origem, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  if (fs.existsSync(destino)) fs.rmSync(destino);
  try {
    fs.linkSync(origem, destino);
  } catch {
    fs.copyFileSync(origem, destino);
  }
}

export default async function montar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const marca = lerMarca();
  const { dados, avisos } = conferirTabela(projeto);
  const transcricao = lerJson(exigirArquivo(projeto.arq('transcricao.json')));
  const take = exigirArquivo(projeto.arq('take.mp4'));
  const info = resumoDoVideo(await sondar(take));
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

  const montagem = montarComposicao({ dados, transcricao, marca, duracao: info.duracao });
  for (const efeito of new Set(montagem.sons.map((s) => s.efeito))) {
    fs.copyFileSync(path.join(KIT, 'sfx', `${efeito}.wav`), path.join(assets, 'sfx', `${efeito}.wav`));
  }

  escreverTexto(path.join(comp, 'estilo.css'), estiloCss(marca, (rel) => fontesUsadas.get(rel) || rel));
  fs.copyFileSync(path.join(KIT, 'molde', 'reel', 'animacao.js'), path.join(comp, 'animacao.js'));
  fs.copyFileSync(path.join(KIT, 'molde', 'reel', 'hyperframes.json'), path.join(comp, 'hyperframes.json'));
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'reel', 'index.tpl.html'), 'utf8');
  const html = preencher(molde, {
    TITULO: escaparHtml(lerEstado(projeto).titulo || projeto.nome),
    DURACAO: String(montagem.dadosReel.duracao),
    GANCHO_FIM: String(montagem.gancho.fim),
    GANCHO: montagem.gancho.html,
    TELAS: montagem.telas.html,
    CTA: montagem.cta.html,
    LEGENDAS: montagem.legendas.html,
    SONS: htmlDosSons(montagem.sons),
    DADOS: jsonParaScript(montagem.dadosReel),
  });
  if (html.includes('{{')) falha('MOLDE_INCOMPLETO', {});
  escreverTexto(path.join(comp, 'index.html'), html);
  escreverJson(path.join(comp, 'sons.json'), montagem.sons);
  escreverJson(path.join(comp, 'legendas.json'), montagem.legendas.arquivo);
  mudarEtapa(projeto, 'montagem');
  return {
    ok: true,
    resumo: `Vídeo montado: ${montagem.legendas.dados.length} legendas, ${(dados.telas || []).length} telas, ${montagem.sons.length} sons.`,
    avisos,
    arquivos: { comp: projeto.rel('comp'), index: projeto.rel('comp', 'index.html'), sons: projeto.rel('comp', 'sons.json'), legendas: projeto.rel('comp', 'legendas.json') },
    dados: { duracao_s: info.duracao, legendas: montagem.legendas.dados.length, telas: (dados.telas || []).length, sons: montagem.sons.length },
  };
}
