import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCenas, validarTela } from '../scripts/lib/cenas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const exemplo = () => JSON.parse(fs.readFileSync(path.join(AQUI, '..', 'esquemas', 'exemplos', 'cenas.json'), 'utf8'));
const problemasDe = (dados) => validarCenas(dados).problemas.map((p) => p.problema).join(' | ');

test('a tabela de exemplo é válida', () => {
  const r = validarCenas(exemplo());
  assert.deepEqual(r.problemas, []);
});

test('chave desconhecida e chave "etiqueta" reprovam', () => {
  const d = exemplo();
  d.cenas[0].cor = 'azul';
  d.cenas[1].etiqueta = 'simulação';
  const texto = problemasDe(d);
  assert.ok(texto.toLowerCase().includes('chave desconhecida'));
  assert.ok(texto.includes('etiqueta'));
});

test('buraco de tempo, primeira cena fora do 0 e falta de título reprovam', () => {
  const d = exemplo();
  d.cenas[1].inicio = 2.8;
  assert.ok(problemasDe(d).includes('buraco'));
  const d2 = exemplo();
  d2.cenas[0].inicio = 0.3;
  assert.ok(problemasDe(d2).includes('começar em 0'));
  const d3 = exemplo();
  delete d3.titulo_gancho;
  assert.ok(problemasDe(d3).includes('título do gancho'));
});

test('mais de uma ênfase por cena reprova', () => {
  const d = exemplo();
  d.cenas[0].enfase = [{ palavra: 'bolo' }, { palavra: 'todo' }];
  assert.ok(problemasDe(d).includes('mais de 1 ênfase'));
});

test('faixa 100 sem tela, ou longa demais, reprova', () => {
  const d = exemplo();
  d.cenas[0].faixa = 100;
  assert.ok(problemasDe(d).includes('faixa 100 só pode'));
  const d2 = exemplo();
  d2.cenas[1].faixa = 100;
  d2.cenas[1].fim = 6.5;
  d2.cenas[2].inicio = 6.5;
  d2.telas[0].sai = 6.4;
  assert.ok(problemasDe(d2).includes('faixa 100 seguida'));
});

test('tela no ar por mais de 4 s reprova', () => {
  const d = exemplo();
  d.telas[0].sai = d.telas[0].entra + 4.5;
  assert.ok(problemasDe(d).includes('no ar'));
});

test('palavra do pedido com espaço reprova', () => {
  const d = exemplo();
  d.cta.palavra = 'DUAS PALAVRAS';
  assert.ok(problemasDe(d).includes('uma palavra só'));
});

test('limites das telas', () => {
  const card = validarTela({ id: 't', tipo: 'card', campos: { texto: 'um dois três quatro cinco seis sete' }, entra: 0, sai: 2 }, 't');
  assert.ok(card.some((p) => p.problema.includes('limite é 6')));
  const numero = validarTela({ id: 'n', tipo: 'numero', campos: { numero: '7 de cada 10', apoio: 'voltam' }, entra: 0, sai: 2 }, 'n');
  assert.ok(numero.some((p) => p.tipo === 'origem'));
  const lista = validarTela({ id: 'l', tipo: 'lista', campos: { itens: ['só um'] }, entra: 0, sai: 2 }, 'l');
  assert.ok(lista.some((p) => p.problema.includes('2 a 4 itens')));
  // "status" deixou de ser obrigatório "online" (Issue #10); continua curto.
  const conversa = validarTela({ id: 'c', tipo: 'conversa', campos: { nome: 'Ana', status: 'visto por último ontem', mensagens: [{ de: 'outro', texto: 'Oi' }] }, entra: 0, sai: 2 }, 'c');
  assert.ok(conversa.some((p) => p.problema.includes('"status"') && p.problema.includes('limite é 3')));
  const notif = validarTela({ id: 'x', tipo: 'notificacao', campos: { app: 'MeuApp', texto: 'Oi' }, entra: 0, sai: 2 }, 'x');
  assert.ok(notif.some((p) => p.problema.includes('"app"')));
  const passos = validarTela({ id: 'p', tipo: 'passos', campos: { itens: ['a', 'b'], atual: 5 }, entra: 0, sai: 2 }, 'p');
  assert.ok(passos.some((p) => p.problema.includes('"atual"')));
  const ok = validarTela({ id: 'k', tipo: 'cta', campos: { palavra: 'FATIAS', frase: 'Comenta aqui' }, entra: 0, sai: 2 }, 'k');
  assert.deepEqual(ok, []);
});

test('rosto pouco vira aviso, não erro', () => {
  const d = exemplo();
  d.cenas.forEach((c) => {
    c.rosto = 'nenhum';
  });
  const r = validarCenas(d, { briefing: { rosto: 'sim' } });
  assert.ok(r.avisos.some((a) => a.codigo === 'ROSTO_POUCO'));
});
