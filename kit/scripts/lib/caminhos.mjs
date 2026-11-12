// Onde ficam as coisas: raiz do repositório, pasta de ferramentas (FERR), projetos e binários.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EH_WINDOWS = process.platform === 'win32';
export const EH_MAC = process.platform === 'darwin';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const KIT = path.join(RAIZ, 'kit');

const PERMITIDOS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-';

export function nomeSeguro(nome) {
  if (!nome) return false;
  for (const ch of nome) {
    if (!PERMITIDOS.includes(ch)) return false;
  }
  return true;
}

// Pasta de ferramentas: sempre dentro do estúdio, em <repo>/.ferramentas (Mac e Windows).
// Assim tudo que o estúdio grava fica dentro da pasta aberta no assistente (no Codex, a área gravável),
// e desinstalar é apagar uma pasta só. ESTUDIO_FERRAMENTAS (definida pelos wrappers) aponta para o mesmo lugar.
export const NOME_PASTA_FERRAMENTAS = '.ferramentas';

// Marcador único de "instalação terminada", gravado pelo instalador (ação verificar).
export const MARCADOR_INSTALACAO = 'instalacao.json';

export function pastaFerramentas(raiz = RAIZ, env = process.env) {
  if (env.ESTUDIO_FERRAMENTAS) return path.resolve(env.ESTUDIO_FERRAMENTAS);
  return path.join(raiz, NOME_PASTA_FERRAMENTAS);
}

export const FERR = pastaFerramentas();

export function binario(nome) {
  const arquivo = path.join(FERR, 'bin', EH_WINDOWS ? `${nome}.exe` : nome);
  if (fs.existsSync(arquivo)) return arquivo;
  return EH_WINDOWS ? `${nome}.exe` : nome;
}

export function instalacaoTerminada() {
  return fs.existsSync(path.join(FERR, MARCADOR_INSTALACAO));
}

export function temBinario(nome) {
  return fs.existsSync(path.join(FERR, 'bin', EH_WINDOWS ? `${nome}.exe` : nome));
}

export const rel = (...partes) => path.join(RAIZ, ...partes);

export const PASTAS = Object.freeze({
  referencias: rel('1-referencias'),
  brutos: rel('2-videos-brutos'),
  prontos: rel('3-videos-prontos'),
  marca: rel('minha-marca'),
  projetos: rel('projetos'),
  guias: rel('guias'),
});

export function relativoARaiz(caminho) {
  const r = path.relative(RAIZ, caminho);
  return r.split(path.sep).join('/');
}

export function daRaiz(caminhoRelativo) {
  if (path.isAbsolute(caminhoRelativo)) return caminhoRelativo;
  return path.join(RAIZ, ...caminhoRelativo.split('/'));
}

export function nomeDeProjetoValido(nome) {
  if (!nome || nome === '.' || nome === '..') return false;
  if (nome.includes('/') || nome.includes('\\') || nome.includes(':')) return false;
  return nomeSeguro(nome);
}

export function pastaProjeto(nome) {
  return path.join(PASTAS.projetos, nome);
}

export function existe(caminho) {
  try {
    fs.accessSync(caminho);
    return true;
  } catch {
    return false;
  }
}

export function garantirPasta(caminho) {
  fs.mkdirSync(caminho, { recursive: true });
  return caminho;
}
