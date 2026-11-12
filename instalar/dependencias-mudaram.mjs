// Diz se a versão nova do estúdio mudou as dependências do montador ou do ouvido de texto.
// Uso: node instalar/dependencias-mudaram.mjs <pasta-atual> <pasta-nova>
// Saída (uma linha JSON): {"montador":true|false,"fala":true|false}
//
// O número da versão do próprio estúdio muda em todo lançamento e aparece no
// package.json, no package-lock.json, no pyproject.toml e no uv.lock. Ele é
// ignorado aqui; senão toda atualização reinstalaria o montador e o ouvido.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PACOTE_FALA = 'estudio-de-reels-fala';

function lerTexto(pasta, nome) {
  try {
    return readFileSync(path.join(pasta, nome), 'utf8');
  } catch {
    return null;
  }
}

function lerJson(pasta, nome) {
  const texto = lerTexto(pasta, nome);
  if (texto === null) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

// package.json e package-lock.json sem o campo "version" do próprio estúdio.
export function assinaturaMontador(pasta) {
  const pkg = lerJson(pasta, 'package.json');
  const lock = lerJson(pasta, 'package-lock.json');
  if (pkg === null || lock === null) return null;
  const { version: _v1, ...pkgSemVersao } = pkg;
  const pacotes = { ...(lock.packages || {}) };
  if (pacotes['']) {
    const { version: _v2, ...raiz } = pacotes[''];
    pacotes[''] = raiz;
  }
  const { version: _v3, ...lockSemVersao } = lock;
  return JSON.stringify({ pkg: pkgSemVersao, lock: { ...lockSemVersao, packages: pacotes } });
}

// pyproject.toml e uv.lock sem a linha de versão do pacote do próprio estúdio.
export function assinaturaFala(pasta) {
  const pyproject = lerTexto(pasta, 'pyproject.toml');
  const uvlock = lerTexto(pasta, 'uv.lock');
  if (pyproject === null || uvlock === null) return null;
  return JSON.stringify({ pyproject: semVersaoPropria(pyproject), uvlock: semVersaoPropria(uvlock) });
}

// Tira a linha `version = "..."` que vem logo depois de `name = "estudio-de-reels-fala"`.
function semVersaoPropria(texto) {
  const linhas = texto.replaceAll('\r\n', '\n').split('\n');
  const saida = [];
  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const anterior = saida.length ? saida[saida.length - 1].trim() : '';
    const ehVersao = linha.trim().startsWith('version = ');
    if (ehVersao && anterior === `name = "${PACOTE_FALA}"`) continue;
    saida.push(linha);
  }
  return saida.join('\n');
}

export function dependenciasMudaram(pastaAtual, pastaNova) {
  const montadorA = assinaturaMontador(pastaAtual);
  const montadorB = assinaturaMontador(pastaNova);
  const falaA = assinaturaFala(pastaAtual);
  const falaB = assinaturaFala(pastaNova);
  // Sem conseguir ler, o seguro é refazer.
  return {
    montador: montadorA === null || montadorB === null || montadorA !== montadorB,
    fala: falaA === null || falaB === null || falaA !== falaB,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [pastaAtual, pastaNova] = process.argv.slice(2);
  if (!pastaAtual || !pastaNova) {
    process.stdout.write('{"montador":true,"fala":true}\n');
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify(dependenciasMudaram(pastaAtual, pastaNova))}\n`);
}
