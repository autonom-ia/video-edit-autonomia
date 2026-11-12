// Ouvido de som (earshot). Uma chamada por vez, 3 threads, só os subcomandos de escuta.
// sfx, kit, forge, llm e o servidor MCP ficam recusados: banco de sons sem licença
// conferida, ou áudio subindo para a internet.
import fs from 'node:fs';
import path from 'node:path';
import { FERR, temBinario, binario } from './caminhos.mjs';
import { rodar } from './executar.mjs';
import { ambienteFilhos } from './ambiente.mjs';
import { falha } from './saida.mjs';

export const SUBCOMANDOS_PERMITIDOS = new Set(['critique', 'timeline', 'sheet', 'match', 'rank', 'doctor', 'describe', 'measure']);

export function earshotDisponivel() {
  return temBinario('earshot');
}

const TRAVA = path.join(FERR, 'estado', 'earshot.trava');
const TRAVA_VELHA_MS = 15 * 60 * 1000;

function pegarTrava() {
  fs.mkdirSync(path.dirname(TRAVA), { recursive: true });
  try {
    fs.mkdirSync(TRAVA);
    return true;
  } catch {
    try {
      const idade = Date.now() - fs.statSync(TRAVA).mtimeMs;
      if (idade > TRAVA_VELHA_MS) {
        fs.rmSync(TRAVA, { recursive: true, force: true });
        fs.mkdirSync(TRAVA);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function earshot(subcomando, argumentos, opcoes = {}) {
  if (!SUBCOMANDOS_PERMITIDOS.has(subcomando)) falha('ARGUMENTO_INVALIDO', { argumento: 'modo', valor: subcomando });
  if (!earshotDisponivel()) return { disponivel: false };
  const inicio = Date.now();
  while (!pegarTrava()) {
    if (Date.now() - inicio > 10 * 60 * 1000) falha('OUVIDO_INDISPONIVEL', { detalhe: 'outra escuta não terminou' });
    await esperar(1000);
  }
  try {
    const env = ambienteFilhos({ EARSHOT_THREADS: '3' });
    const r = await rodar(binario('earshot'), [subcomando, ...argumentos], { env, timeoutMs: 15 * 60 * 1000, ...opcoes });
    return { disponivel: true, ...r };
  } finally {
    fs.rmSync(TRAVA, { recursive: true, force: true });
  }
}
