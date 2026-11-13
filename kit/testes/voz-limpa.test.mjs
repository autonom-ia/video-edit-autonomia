// Limpeza da voz e som do bruto no relógio do arquivo. Medido em 13/11/2026: o filtro antigo
// (afftdn) atrasava a voz 25 ms; a voz limpa sai com deslocamento zero em relação ao som original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grafoDeCorte } from '../scripts/comandos/cortar.mjs';
import { argumentosDoSom } from '../scripts/lib/som-do-bruto.mjs';
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

test('a voz limpa é refeita quando muda o bruto ou o limite', () => {
  const origem = { arquivo: '2-videos-brutos/a.MOV', tamanho: 10, modificado: '2026-11-13T10:00:00Z', largura: 1080 };
  const ficha = fichaDaLimpeza(origem);
  assert.deepEqual(ficha, { arquivo: origem.arquivo, tamanho: 10, modificado: origem.modificado, limite_db: LIMPEZA.limiteDb });
  assert.notDeepEqual(fichaDaLimpeza({ ...origem, tamanho: 11 }), ficha);
  assert.notDeepEqual(fichaDaLimpeza(origem, 12), ficha);
});
