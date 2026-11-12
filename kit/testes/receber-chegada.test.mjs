import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pastasDeChegada, videosChegados } from '../scripts/comandos/receber.mjs';

test('no Windows procura também em Imagens e Vídeos, até 2 níveis', () => {
  const lista = pastasDeChegada({}, 'win32');
  const nomes = lista.map((i) => path.basename(i.pasta));
  assert.deepEqual(nomes, ['Downloads', 'Pictures', 'Videos']);
  assert.equal(lista[1].niveis, 2);
  assert.deepEqual(pastasDeChegada({}, 'darwin').map((i) => path.basename(i.pasta)), ['Downloads']);
});

test('acha vídeo importado pelo Fotos numa subpasta de ano e mês', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'chegada-'));
  const fundo = path.join(raiz, 'Pictures', '2026', '11');
  fs.mkdirSync(fundo, { recursive: true });
  fs.mkdirSync(path.join(raiz, 'Downloads'));
  fs.writeFileSync(path.join(fundo, 'VID_1.mp4'), 'x');
  const pastas = [{ pasta: path.join(raiz, 'Downloads'), niveis: 0 }, { pasta: path.join(raiz, 'Pictures'), niveis: 2 }];
  const r = videosChegados({ pastas, agora: Date.now() });
  assert.equal(r.videos.length, 1);
  assert.equal(r.videos[0].nome, 'VID_1.mp4');
  assert.equal(r.semPermissao, false);
  fs.rmSync(raiz, { recursive: true, force: true });
});
