// Confere se o estúdio está pronto para ser distribuído (antes de publicar uma versão).
// Falha se sobrar o marcador CONTA nos textos de instalação, se algum endereço do GitHub
// ainda apontar para um repositório que não é o oficial, ou se faltar package-lock.json ou uv.lock.
// Uso: npm run conferir-distribuicao  (ou ./estudio conferir-distribuicao)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ } from '../lib/caminhos.mjs';
import { imprimirResultado } from '../lib/saida.mjs';

export const CONTA_OFICIAL = 'autonom-ia';
export const REPOSITORIO_OFICIAL = 'video-edit-autonomia';
export const MARCADOR = 'CONTA';
export const TEXTOS_DE_INSTALACAO = Object.freeze(['README.md', 'instalar/comandos-unicos.md', 'instalar/versoes.env']);
export const TRAVAS = Object.freeze(['package-lock.json', 'uv.lock']);

const ehParteDeNome = (ch) => Boolean(ch) && ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '_');
const fimDeSegmento = (ch) => !ch || ' \t\r\n"\'`)<>]#?'.includes(ch);

// Linhas (1, 2, ...) onde o marcador aparece como palavra inteira.
export function linhasComMarcador(texto, marcador = MARCADOR) {
  const achadas = [];
  String(texto).split('\n').forEach((linha, i) => {
    let k = linha.indexOf(marcador);
    while (k !== -1) {
      if (!ehParteDeNome(linha[k - 1]) && !ehParteDeNome(linha[k + marcador.length])) {
        achadas.push(i + 1);
        break;
      }
      k = linha.indexOf(marcador, k + 1);
    }
  });
  return achadas;
}

function segmentos(texto, inicio, quantos) {
  const lista = [];
  let atual = '';
  for (let k = inicio; k < texto.length && lista.length < quantos; k += 1) {
    const ch = texto[k];
    if (ch === '/' || fimDeSegmento(ch)) {
      lista.push(atual);
      atual = '';
      if (fimDeSegmento(ch)) break;
    } else {
      atual += ch;
    }
  }
  if (atual && lista.length < quantos) lista.push(atual);
  return lista;
}

// Pares "conta/repositório" citados como github.com/<conta>/<repo> ou --repo <conta>/<repo>.
export function repositoriosCitados(texto) {
  const pares = [];
  for (const prefixo of ['github.com/', '--repo ']) {
    let k = texto.indexOf(prefixo);
    while (k !== -1) {
      const [conta, repo] = segmentos(texto, k + prefixo.length, 2);
      if (conta && repo) pares.push({ conta, repo: repo.endsWith('.git') ? repo.slice(0, -4) : repo });
      k = texto.indexOf(prefixo, k + prefixo.length);
    }
  }
  return pares;
}

// Repositório do estúdio com nome ou conta errados (outros projetos, como o FFmpeg, ficam de fora).
export function repositoriosErrados(texto) {
  return repositoriosCitados(texto).filter(
    ({ conta, repo }) => (repo === 'estudio-de-reels' || repo === REPOSITORIO_OFICIAL || conta === MARCADOR)
      && !(conta === CONTA_OFICIAL && repo === REPOSITORIO_OFICIAL),
  );
}

function travaDoNpmEmDia(raiz) {
  try {
    const pacote = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    const trava = JSON.parse(fs.readFileSync(path.join(raiz, 'package-lock.json'), 'utf8'));
    const raizTrava = (trava.packages && trava.packages['']) || {};
    const quer = pacote.dependencies || {};
    const tem = raizTrava.dependencies || {};
    const diferentes = Object.keys({ ...quer, ...tem }).filter((nome) => quer[nome] !== tem[nome]);
    return diferentes.length ? `package-lock.json não bate com package.json em: ${diferentes.join(', ')}` : '';
  } catch (erro) {
    return `não consegui ler package.json ou package-lock.json (${erro.message})`;
  }
}

export function conferirDistribuicao(raiz = RAIZ) {
  const problemas = [];
  for (const rel of TEXTOS_DE_INSTALACAO) {
    const arquivo = path.join(raiz, ...rel.split('/'));
    if (!fs.existsSync(arquivo)) {
      problemas.push(`${rel}: arquivo não existe`);
      continue;
    }
    const texto = fs.readFileSync(arquivo, 'utf8');
    const linhas = linhasComMarcador(texto);
    if (linhas.length) problemas.push(`${rel}: sobrou o marcador ${MARCADOR} na(s) linha(s) ${linhas.join(', ')}`);
    for (const { conta, repo } of repositoriosErrados(texto)) {
      problemas.push(`${rel}: endereço ${conta}/${repo} deveria ser ${CONTA_OFICIAL}/${REPOSITORIO_OFICIAL}`);
    }
  }
  for (const trava of TRAVAS) {
    const arquivo = path.join(raiz, trava);
    if (!fs.existsSync(arquivo) || fs.statSync(arquivo).size === 0) problemas.push(`${trava}: falta (gere e versione antes de publicar)`);
  }
  if (fs.existsSync(path.join(raiz, 'package-lock.json'))) {
    const p = travaDoNpmEmDia(raiz);
    if (p) problemas.push(p);
  }
  return { ok: problemas.length === 0, problemas };
}

export default async function conferirDistribuicaoComando() {
  const { ok, problemas } = conferirDistribuicao();
  return {
    ok,
    codigo: ok ? undefined : 'DISTRIBUICAO_INCOMPLETA',
    resumo: ok ? 'Textos e travas prontos para distribuir (o repositório, a tag e o release no GitHub não são conferidos aqui).' : `${problemas.length} problema(s) antes de distribuir.`,
    dados: { problemas, repositorio: `https://github.com/${CONTA_OFICIAL}/${REPOSITORIO_OFICIAL}` },
  };
}

// Rodado direto pelo node (npm run conferir-distribuicao).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const resultado = await conferirDistribuicaoComando();
  imprimirResultado('conferir-distribuicao', resultado);
  process.exitCode = resultado.ok ? 0 : 1;
}
