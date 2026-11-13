// Limpeza da voz e som do bruto no relógio do arquivo. Medido em 13/11/2026: o filtro antigo
// (afftdn) atrasava a voz 25 ms; a voz limpa sai com deslocamento zero em relação ao som original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grafoDeCorte } from '../scripts/comandos/cortar.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { argumentosDoSom, mesmaFicha } from '../scripts/lib/som-do-bruto.mjs';
import { fichaDaLimpeza } from '../scripts/lib/voz-limpa.mjs';
import { LIMPEZA } from '../scripts/lib/regras.mjs';

const TRECHOS = [{ inicio: 0.5, fim: 2 }, { inicio: 3, fim: 4 }];

test('com voz limpa, o som vem da segunda entrada e sem o filtro antigo', () => {
  const g = grafoDeCorte(TRECHOS, { vozLimpa: true });
  assert.ok(g.includes('[1:a]atrim=start=0.5:end=2'));
  assert.ok(!g.includes('[0:a]'));
  assert.ok(!g.includes('afftdn'));
});

test('sem voz limpa, fica tudo como antes (som do vídeo e afftdn)', () => {
  const g = grafoDeCorte(TRECHOS);
  assert.ok(g.includes('[0:a]atrim=start=0.5:end=2'));
  assert.ok(g.includes('afftdn=nf=-25'));
});

test('o som do bruto sai no relógio do arquivo (começo completado com silêncio)', () => {
  const args = argumentosDoSom('bruto.MOV', 'som.wav');
  assert.equal(args[args.indexOf('-af') + 1], 'aresample=async=1:first_pts=0');
  assert.deepEqual(args.slice(args.indexOf('-ac'), args.indexOf('-ac') + 4), ['-ac', '1', '-ar', '48000']);
});

test('a voz limpa é refeita quando muda o som, o limite ou a versão da limpeza', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-limpa-'));
  const som = path.join(pasta, 'som.wav');
  fs.writeFileSync(som, 'abc');
  const ficha = fichaDaLimpeza(som);
  assert.equal(ficha.limite_db, LIMPEZA.limiteDb);
  assert.equal(ficha.script.length, 64, 'hash do limpar_voz.py');
  assert.ok(mesmaFicha(ficha, fichaDaLimpeza(som)));
  assert.ok(!mesmaFicha(ficha, fichaDaLimpeza(som, 12)), 'outro limite');
  fs.writeFileSync(som, 'abcd');
  assert.ok(!mesmaFicha(ficha, fichaDaLimpeza(som)), 'outro som no mesmo caminho');
  fs.rmSync(pasta, { recursive: true });
});
