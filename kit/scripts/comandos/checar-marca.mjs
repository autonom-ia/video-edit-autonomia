// Barra o render se a composição tiver cor, nome ou palavra proibida (marca do aluno + apps famosos).
// Cores em rgb(), hsl() e oklch() são convertidas para hex antes de comparar.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto, exigirArquivo, lerMarca } from '../lib/projeto.mjs';
import { escreverJson } from '../lib/json.mjs';
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

export function checarTextos(arquivos, { cores, termos, coresDaMarca }) {
  const problemas = [];
  for (const { nome, conteudo } of arquivos) {
    const encontradas = coresNoTexto(conteudo);
    for (const proibida of cores) {
      if (coresDaMarca.some((c) => distancia(c, proibida) < 12)) continue;
      if (encontradas.some((c) => distancia(c, proibida) < 6)) problemas.push({ arquivo: nome, problema: `cor de app famoso ${proibida}` });
    }
    const normal = normalizar(conteudo);
    for (const termo of termos) {
      if (contemTermo(normal, termo)) problemas.push({ arquivo: nome, problema: `contém "${termo}"` });
    }
  }
  return problemas;
}

export async function checarProjeto(projeto) {
  const comp = projeto.arq('comp');
  exigirArquivo(path.join(comp, 'index.html'));
  const marca = lerMarca();
  const padrao = lerCatalogo('proibidos-padrao.json');
  const coresDaMarca = Object.values(marca.cores).map(normalizarHex).filter(Boolean);
  const cores = [...new Set([...(marca.proibidos.cores || []), ...padrao.cores].map(normalizarHex).filter(Boolean))];
  const termos = [...new Set([...(marca.proibidos.palavras || []), ...(marca.proibidos.marcas || []), ...padrao.marcas])].filter((t) => String(t).trim());
  const arquivos = listar(comp)
    .filter((c) => TEXTO.has(path.extname(c).toLowerCase()) && !BIBLIOTECAS.has(path.basename(c)))
    .map((c) => ({ nome: projeto.rel(path.relative(projeto.pasta, c)), conteudo: fs.readFileSync(c, 'utf8') }));
  const problemas = checarTextos(arquivos, { cores, termos, coresDaMarca });
  const resultado = { resultado: problemas.length ? 'REPROVADO' : 'APROVADO', arquivos_conferidos: arquivos.length, problemas, quando: new Date().toISOString() };
  escreverJson(projeto.arq('checagem-marca.json'), resultado);
  return resultado;
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
