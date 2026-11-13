import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, normalizar, contarPalavras, contemTermo, tirarInvisiveis, pontuacaoFinal } from '../scripts/lib/texto.mjs';
import { sanear } from '../scripts/lib/executar.mjs';
import { gruposDeLegenda, tempoDosGrupos, legendaY } from '../scripts/lib/legenda.mjs';

const p = (texto, inicio, fim) => ({ texto, inicio, fim });

test('slug tira acento, espaço e pontuação', () => {
  assert.equal(slug('Quantas fatias pedir? Ação!'), 'quantas-fatias-pedir-acao');
  assert.equal(slug('   '), 'video');
  assert.equal(slug('a'.repeat(60)).length, 40);
});

test('normalizar compara palavras sem acento e sem pontuação', () => {
  assert.equal(normalizar('Cardápio,'), 'cardapio');
  assert.equal(normalizar('  Olá,   MUNDO!! '), 'ola mundo');
});

test('contar palavras usa split por espaço e ignora caracteres invisíveis', () => {
  assert.equal(contarPalavras('um  dois\ttrês'), 3);
  assert.equal(tirarInvisiveis('a​b'), 'ab');
  assert.equal(contarPalavras(''), 0);
});

test('contemTermo acha palavra inteira, não pedaço', () => {
  assert.equal(contemTermo(normalizar('Uso o WhatsApp todo dia'), 'whatsapp'), true);
  assert.equal(contemTermo(normalizar('Que bolo exuberante'), 'Uber'), false);
  assert.equal(contemTermo(normalizar('Resultado garantido.'), 'garantido'), true);
});

test('pontuacaoFinal devolve só a pontuação do fim', () => {
  assert.equal(pontuacaoFinal('fatias?!'), '?!');
  assert.equal(pontuacaoFinal('fatias'), '');
});

test('sanear troca sequências de 32+ caracteres por <REDACTED>', () => {
  const segredo = 'a'.repeat(40);
  assert.equal(sanear(`chave=${segredo} fim`), 'chave=<REDACTED> fim');
  assert.equal(sanear('curto-demais'), 'curto-demais');
});

test('grupos de legenda: até 3 palavras e 22 caracteres', () => {
  const ws = [p('Você', 0, 0.2), p('sabe', 0.2, 0.4), p('quantas', 0.4, 0.7), p('fatias', 0.7, 1.0), p('pedir?', 1.0, 1.3), p('Eu', 1.6, 1.7), p('explico', 1.7, 2.1)];
  const g = gruposDeLegenda(ws).map((x) => x.map((w) => w.texto).join(' '));
  assert.deepEqual(g, ['Você sabe quantas', 'fatias pedir?', 'Eu explico']);
  for (const grupo of g) assert.ok([...grupo].length <= 22);
});

test('grupos de legenda quebram em pausa de 0,15 s e no limite de caracteres', () => {
  const ws = [p('Encomendaram', 0, 0.5), p('aniversário', 0.5, 1.0), p('ontem', 1.2, 1.5)];
  const g = gruposDeLegenda(ws).map((x) => x.map((w) => w.texto).join(' '));
  assert.deepEqual(g, ['Encomendaram', 'aniversário', 'ontem']);
});

test('tempo dos grupos: o primeiro aparece no quadro 0 e nenhum sobrepõe o próximo', () => {
  const grupos = gruposDeLegenda([p('O', 0.3, 0.4), p('bolo', 0.4, 0.8), p('chegou.', 0.8, 1.2), p('Faltou', 1.5, 1.9)]);
  const t = tempoDosGrupos(grupos);
  assert.equal(t[0].inicio, 0);
  assert.ok(t[0].fim <= t[1].inicio);
  assert.equal(legendaY(50), 988);
  assert.equal(legendaY(100), 1424);
});
