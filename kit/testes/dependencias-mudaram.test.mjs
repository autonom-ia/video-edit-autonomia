import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dependenciasMudaram } from '../../instalar/dependencias-mudaram.mjs';

function pasta(versao, { gsap = '3.14.2', av = '<19', onnx = '1.31.1' } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'deps-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'estudio-de-reels', version: versao, dependencies: { gsap } }));
  writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({
    name: 'estudio-de-reels', version: versao, lockfileVersion: 3,
    packages: { '': { name: 'estudio-de-reels', version: versao, dependencies: { gsap } }, 'node_modules/gsap': { version: gsap } },
  }));
  writeFileSync(path.join(dir, 'pyproject.toml'), `[project]\nname = "estudio-de-reels-fala"\nversion = "${versao}"\ndependencies = ["av${av}"]\n`);
  writeFileSync(path.join(dir, 'uv.lock'), `version = 1\n\n[[package]]\nname = "estudio-de-reels-fala"\nversion = "${versao}"\n\n[[package]]\nname = "onnxruntime"\nversion = "${onnx}"\n`);
  return dir;
}

test('só a versão do estúdio mudou: não refaz montador nem ouvido', () => {
  assert.deepEqual(dependenciasMudaram(pasta('1.0.3'), pasta('1.0.4')), { montador: false, fala: false });
});

test('dependência do montador mudou: refaz só o montador', () => {
  assert.deepEqual(dependenciasMudaram(pasta('1.0.3'), pasta('1.0.4', { gsap: '3.15.0' })), { montador: true, fala: false });
});

test('dependência do ouvido mudou: refaz só o ouvido', () => {
  assert.deepEqual(dependenciasMudaram(pasta('1.0.3'), pasta('1.0.4', { onnx: '1.23.2' })), { montador: false, fala: true });
});

test('arquivo faltando: refaz os dois, por segurança', () => {
  const vazia = mkdtempSync(path.join(tmpdir(), 'deps-vazia-'));
  assert.deepEqual(dependenciasMudaram(vazia, pasta('1.0.4')), { montador: true, fala: true });
});

test('versão de outro pacote no uv.lock não é ignorada', () => {
  assert.deepEqual(dependenciasMudaram(pasta('1.0.3', { onnx: '1.31.1' }), pasta('1.0.3', { onnx: '1.31.2' })).fala, true);
});
