// Barra o render se a composição tiver cor, nome ou palavra proibida (marca do aluno + apps famosos).
// App que o aluno usa de verdade e declara em apps_reais (cenas.json) fica liberado neste vídeo.
// Cores em rgb(), hsl() e oklch() são convertidas para hex antes de comparar.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto, exigirArquivo, lerMarca, lerBriefing } from '../lib/projeto.mjs';
import { escreverJson, lerJson } from '../lib/json.mjs';
import { textoVisivel, textosDeScript, textosDeContentCss, blocosDaTag } from '../lib/texto-visivel.mjs';
import { reprovado } from '../lib/saida.mjs';
import { lerCatalogo } from '../lib/marca.mjs';
import { coresNoTexto, normalizarHex, distancia } from '../lib/cores.mjs';
import { normalizar, contemTermo } from '../lib/texto.mjs';

const TEXTO = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);
const IGNORAR = new Set(['node_modules', '.hyperframes', 'renders']);
const BIBLIOTECAS = new Set(['gsap.min.js']);

function listar(dir) {
  const achados = [];
  for (const nome of fs.readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    const c = path.join(dir, nome);
    const st = fs.lstatSync(c);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) achados.push(...listar(c));
    else achados.push(c);
  }
  return achados;
}

// Palavra proibida conta no que pode aparecer na tela: o texto do HTML e do SVG, os textos entre
// aspas dos scripts (o que o TextPlugin escreve) e o "content:" do CSS. Não conta valor de estilo
// ("width: 100%"), que travava a prévia (Issue #10, bug B1).
// Cor de app famoso conta em qualquer arquivo de texto da composição.
export function textoQuePodeAparecer(nome, conteudo) {
  const ext = path.extname(nome).toLowerCase();
  if (ext === '.html' || ext === '.htm' || ext === '.svg') {
    return [
      textoVisivel(conteudo),
      ...blocosDaTag(conteudo, 'script').flatMap((js) => textosDeScript(js)),
      ...blocosDaTag(conteudo, 'style').flatMap((css) => textosDeContentCss(css)),
    ].join(' ');
  }
  if (ext === '.js' || ext === '.mjs') return textosDeScript(conteudo).join(' ');
  if (ext === '.css') return textosDeContentCss(conteudo).join(' ');
  return '';
}

export function checarTextos(arquivos, { cores, termos, coresDaMarca }) {
  const problemas = [];
  for (const { nome, conteudo } of arquivos) {
    const encontradas = coresNoTexto(conteudo);
    for (const proibida of cores) {
      if (coresDaMarca.some((c) => distancia(c, proibida) < 12)) continue;
      if (encontradas.some((c) => distancia(c, proibida) < 6)) problemas.push({ arquivo: nome, problema: `cor de app famoso ${proibida}` });
    }
    const normal = normalizar(textoQuePodeAparecer(nome, conteudo));
    if (!normal) continue;
    for (const termo of termos) {
      if (contemTermo(normal, termo)) problemas.push({ arquivo: nome, problema: `contém "${termo}"` });
    }
  }
  return problemas;
}

// Apps que o aluno usa de verdade e cita na fala (cenas.json, apps_reais): o nome e as cores
// do grupo do app saem da lista padrão neste vídeo (Codex libera OpenAI e ChatGPT, de propósito:
// a tela real do Codex mostra esses nomes). Os nomes que o próprio aluno proibiu continuam
// proibidos. Cor o aluno não proíbe: as cores da marca.json vêm todas da lista padrão.
export function liberadosPelosApps(padrao, appsReais) {
  const nomes = new Set();
  const cores = new Set();
  for (const app of Array.isArray(appsReais) ? appsReais : []) {
    const alvo = normalizar(app && app.nome);
    if (!alvo) continue;
    nomes.add(alvo);
    for (const grupo of padrao.apps || []) {
      if (!grupo.nomes.some((n) => normalizar(n) === alvo)) continue;
      grupo.nomes.forEach((n) => nomes.add(normalizar(n)));
      grupo.cores.forEach((c) => cores.add(normalizarHex(c)));
    }
  }
  return { nomes, cores };
}

// Monta as listas de cor e de termo proibidos para um vídeo.
export function listasProibidas({ marca, padrao, briefing, appsReais }) {
  const liberados = liberadosPelosApps(padrao, appsReais);
  const padraoNormal = new Set(padrao.marcas.map((m) => normalizar(m)));
  // A lista do aluno: a do briefing mais a da marca.json (sem os nomes que vieram da lista padrão).
  const marcasDoAluno = [
    ...(briefing && Array.isArray(briefing.marcas_proibidas) ? briefing.marcas_proibidas : []),
    ...(marca.proibidos.marcas || []).filter((m) => !padraoNormal.has(normalizar(m))),
  ];
  const termos = [
    ...(marca.proibidos.palavras || []),
    ...marcasDoAluno,
    ...padrao.marcas.filter((m) => !liberados.nomes.has(normalizar(m))),
  ];
  const cores = [...(marca.proibidos.cores || []), ...padrao.cores].map(normalizarHex).filter((c) => c && !liberados.cores.has(c));
  return {
    termos: [...new Set(termos.filter((t) => String(t).trim()))],
    cores: [...new Set(cores)],
    liberados: [...liberados.nomes],
  };
}

export async function checarProjeto(projeto) {
  const comp = projeto.arq('comp');
  exigirArquivo(path.join(comp, 'index.html'));
  const marca = lerMarca();
  const padrao = lerCatalogo('proibidos-padrao.json');
  const cenas = fs.existsSync(projeto.arq('cenas.json')) ? lerJson(projeto.arq('cenas.json')) : {};
  const coresDaMarca = Object.values(marca.cores).map(normalizarHex).filter(Boolean);
  const { termos, cores, liberados } = listasProibidas({ marca, padrao, briefing: lerBriefing(false), appsReais: cenas.apps_reais });
  const arquivos = listar(comp)
    .filter((c) => TEXTO.has(path.extname(c).toLowerCase()) && !BIBLIOTECAS.has(path.basename(c)) && !ehPluginGsap(comp, c))
    .map((c) => ({ nome: projeto.rel(path.relative(projeto.pasta, c)), conteudo: fs.readFileSync(c, 'utf8') }));
  const problemas = checarTextos(arquivos, { cores, termos, coresDaMarca });
  const resultado = { resultado: problemas.length ? 'REPROVADO' : 'APROVADO', arquivos_conferidos: arquivos.length, apps_liberados: liberados, problemas, quando: new Date().toISOString() };
  escreverJson(projeto.arq('checagem-marca.json'), resultado);
  return resultado;
}

// Os plugins do GSAP copiados para assets/gsap são biblioteca, não conteúdo do vídeo.
function ehPluginGsap(comp, caminho) {
  return path.dirname(caminho) === path.join(comp, 'assets', 'gsap');
}

export default async function checarMarca({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const r = await checarProjeto(projeto);
  if (r.resultado === 'REPROVADO') reprovado('MARCA_REPROVADA', { problemas: r.problemas.slice(0, 20) });
  return {
    ok: true,
    resumo: `Marca aprovada: ${r.arquivos_conferidos} arquivos conferidos.`,
    arquivos: { checagem: projeto.rel('checagem-marca.json') },
    dados: r,
  };
}
