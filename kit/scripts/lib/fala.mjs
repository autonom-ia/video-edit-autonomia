// Ouvido de texto: chama kit/py/transcrever.py pelo uv (faster-whisper, português, tempo por palavra).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RAIZ, KIT, FERR, binario } from './caminhos.mjs';
import { rodar, ultimasLinhas } from './executar.mjs';
import { ambienteFilhos } from './ambiente.mjs';
import { falha } from './saida.mjs';
import { FALA } from './regras.mjs';

const SCRIPT = path.join(KIT, 'py', 'transcrever.py');
const FICHA = path.join(FERR, 'kit-fala.json');

export function modeloAutomatico() {
  const gb = os.totalmem() / 1024 ** 3;
  return gb < FALA.memoriaMinimaGb ? FALA.modeloPequeno : FALA.modeloGrande;
}

export function fichaDaFala() {
  try {
    return JSON.parse(fs.readFileSync(FICHA, 'utf8'));
  } catch {
    return null;
  }
}

export function gravarFichaDaFala(modelo) {
  fs.mkdirSync(path.dirname(FICHA), { recursive: true });
  fs.writeFileSync(FICHA, `${JSON.stringify({ modelo, pronto: true }, null, 2)}\n`, 'utf8');
}

// Lê CHAVE=VALOR de instalar/versoes.env (corta no primeiro "="; linhas com # são comentário).
export function lerVersoes(arquivo = path.join(RAIZ, 'instalar', 'versoes.env')) {
  const valores = {};
  let texto = '';
  try {
    texto = fs.readFileSync(arquivo, 'utf8');
  } catch {
    return valores;
  }
  for (const linha of texto.split('\n')) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    valores[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return valores;
}

// Revisão fixa de cada modelo de fala no Hugging Face (definida pelo instalador em versoes.env).
// FALA_MODELO_REVISAO vale para o large-v3-turbo; FALA_MODELO_REVISAO_SMALL para o small.
export const VARIAVEIS_DE_REVISAO = Object.freeze(['FALA_MODELO_REVISAO', 'FALA_MODELO_REVISAO_SMALL']);

export function ambienteDaFala(env = process.env, versoes = lerVersoes()) {
  const extra = {};
  for (const nome of VARIAVEIS_DE_REVISAO) {
    if (!env[nome] && versoes[nome]) extra[nome] = versoes[nome];
  }
  return extra;
}

// Argumentos do uv. Sem "--python" fixo: vale UV_PYTHON do ambiente (no Windows ARM é o Python x86_64
// com que o instalador sincronizou o ambiente). "--frozen" usa o uv.lock versionado, sem resolver de novo.
export function argumentosDoUv(argumentos, env = process.env) {
  const base = ['run', '--project', RAIZ, '--frozen'];
  if (env.UV_PYTHON) base.push('--python', env.UV_PYTHON);
  return [...base, '--quiet', 'python', SCRIPT, ...argumentos];
}

async function uv(argumentos, timeoutMs, { semInternet = false } = {}) {
  const extra = ambienteDaFala();
  // Depois do preparar-fala o modelo já está no computador: a transcrição não precisa de internet.
  if (semInternet) extra.HF_HUB_OFFLINE = '1';
  const r = await rodar(binario('uv'), argumentosDoUv(argumentos), {
    env: ambienteFilhos(extra),
    cwd: RAIZ,
    timeoutMs,
  });
  if (r.naoAchou) falha('FERRAMENTA_FALTANDO', { ferramenta: 'uv' });
  return r;
}

export async function prepararModelo(modelo) {
  const r = await uv(['--preparar', '--modelo', modelo], 2 * 60 * 60 * 1000);
  if (r.codigo !== 0) falha('MODELO_FALA_FALTA', { modelo, detalhe: ultimasLinhas(r.erro || r.saida, 8) });
  gravarFichaDaFala(modelo);
  return modelo;
}

export async function rodarTranscricao(entrada, saida) {
  const ficha = fichaDaFala();
  if (!ficha || !ficha.pronto) falha('MODELO_FALA_FALTA', { dica: 'rode ./estudio preparar-fala --modelo auto' });
  const r = await uv(['--entrada', entrada, '--saida', saida, '--modelo', ficha.modelo], 60 * 60 * 1000, { semInternet: true });
  if (r.codigo !== 0 || !fs.existsSync(saida)) falha('TRANSCRICAO_FALHOU', { detalhe: ultimasLinhas(r.erro || r.saida, 8) });
  return saida;
}
