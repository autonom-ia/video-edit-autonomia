// Voz limpa do bruto (DPDFNet, kit/py/limpar_voz.py), feita uma vez por bruto: o cortar roda
// várias vezes enquanto o assistente acerta os trechos, e a limpeza não muda com os trechos.
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';
import { ultimasLinhas } from './executar.mjs';
import { uv } from './fala.mjs';
import { lerJson } from './json.mjs';
import { LIMPEZA } from './regras.mjs';

const SCRIPT = path.join(KIT, 'py', 'limpar_voz.py');
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

// A ficha diz de qual bruto e com qual limite a voz limpa saiu.
export function fichaDaLimpeza(origem, limiteDb = LIMPEZA.limiteDb) {
  return { arquivo: origem.arquivo, tamanho: origem.tamanho, modificado: origem.modificado, limite_db: limiteDb };
}

const mesmaFicha = (a, b) => Boolean(a && b) && Object.keys(b).every((k) => a[k] === b[k]);

// somWav: bruto/som.wav (som do bruto no relógio do arquivo). A voz limpa sai no mesmo tempo.
// Devolve { arquivo, reaproveitada } ou { erro } (sem limpeza o corte segue com o filtro antigo).
export async function vozLimpa(pastaCorte, somWav, origem) {
  const wav = path.join(pastaCorte, 'voz-limpa.wav');
  const arqFicha = path.join(pastaCorte, 'voz-limpa.json');
  const ficha = fichaDaLimpeza(origem);
  if (fs.existsSync(wav) && mesmaFicha(lerJson(arqFicha, null), ficha)) return { arquivo: wav, reaproveitada: true };
  const r = await uv(['--entrada', somWav, '--saida', wav, '--limite-db', String(ficha.limite_db)], TEMPO_MAXIMO_MS, { script: SCRIPT });
  if (r.codigo !== 0 || !fs.existsSync(wav)) return { erro: ultimasLinhas(r.erro || r.saida, 6) };
  fs.writeFileSync(arqFicha, `${JSON.stringify(ficha, null, 2)}\n`, 'utf8');
  return { arquivo: wav, reaproveitada: false };
}

export async function prepararLimpeza() {
  const r = await uv(['--preparar'], TEMPO_MAXIMO_MS, { script: SCRIPT });
  return r.codigo === 0 ? { ok: true } : { erro: ultimasLinhas(r.erro || r.saida, 6) };
}
