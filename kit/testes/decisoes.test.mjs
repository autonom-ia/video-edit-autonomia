// Testes da Issue #8 (teste no Codex, 12/11/2026): gates só com a resposta do aluno,
// entrega presa à nota mínima, área protegida reconhecida e teto do limitador abaixo do pico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarGate, gateDoAluno, registrarAvaliacao, conferirEntrega, conferirMusica } from '../scripts/lib/decisoes.mjs';
import { emAreaProtegida, erroDeAreaProtegida, codigoDoNavegador } from '../scripts/lib/area-protegida.mjs';
import { estadoNovo } from '../scripts/lib/projeto.mjs';
import { grafoFinal } from '../scripts/lib/mixer.mjs';
import { SOM } from '../scripts/lib/regras.mjs';

const QUANDO = '2026-11-12T19:00:00.000Z';

function fechar(estado, nome, valor, resposta = 'Aprovado, pode seguir') {
  const r = aplicarGate(estado, nome, valor, resposta, QUANDO);
  assert.ok(r.estado, `gate ${nome} não fechou`);
  return r.estado;
}

function avaliar(estado, nota, pareceCopia = false) {
  const comRodada = { ...estado, rodadas: { ...estado.rodadas, video: (estado.rodadas.video || 0) + 1 } };
  return registrarAvaliacao(comRodada, { tipo: 'video', nota, pareceCopia, quando: QUANDO }).estado;
}

test('gate sem a resposta do aluno é recusado e não muda o estado', () => {
  const estado = estadoNovo('p', 'P', 'B');
  for (const resposta of [undefined, '', '   ', true]) {
    const r = aplicarGate(estado, 'previa', 'aprovado', resposta, QUANDO);
    assert.deepEqual(r.erro, { codigo: 'GATE_SEM_RESPOSTA', dados: { gate: 'previa' } });
    assert.equal(r.estado, undefined);
  }
  assert.equal(estado.gates.previa, null);
});

test('gate com resposta grava as palavras do aluno; reabrir apaga a resposta', () => {
  const fechado = fechar(estadoNovo('p', 'P', 'B'), 'cenas', 'aprovado', '  Aprovar  ');
  assert.equal(fechado.gates.cenas, 'aprovado');
  assert.deepEqual(fechado.respostas.cenas, { valor: 'aprovado', texto: 'Aprovar', quando: QUANDO });
  assert.ok(gateDoAluno(fechado, 'cenas', 'aprovado'));
  const reaberto = aplicarGate(fechado, 'cenas', '', undefined, QUANDO).estado;
  assert.equal(reaberto.gates.cenas, null);
  assert.equal(reaberto.respostas.cenas, undefined);
});

test('gate gravado à mão no estado, sem resposta, não vale', () => {
  const estado = { ...estadoNovo('p', 'P', 'B'), gates: { previa: 'aprovado' } };
  assert.equal(gateDoAluno(estado, 'previa', 'aprovado'), false);
});

test('nota do avaliador: aceita vírgula, recusa fora de 0 a 10 e guarda a rodada', () => {
  const estado = { ...estadoNovo('p', 'P', 'B'), rodadas: { roteiro: 0, video: 2 } };
  const ok = registrarAvaliacao(estado, { tipo: 'video', nota: '8,2', pareceCopia: false, quando: QUANDO }).estado;
  assert.deepEqual(ok.avaliacoes, [{ tipo: 'video', rodada: 2, nota: 8.2, parece_copia: false, quando: QUANDO }]);
  for (const nota of ['abc', '11', '-1']) {
    assert.equal(registrarAvaliacao(estado, { tipo: 'video', nota, pareceCopia: false, quando: QUANDO }).erro.codigo, 'ARGUMENTO_INVALIDO');
  }
});

test('entrega: sem prévia do aluno, sem avaliação ou abaixo de 8,5 é barrada', () => {
  const novo = estadoNovo('p', 'P', 'B');
  assert.equal(conferirEntrega(novo).codigo, 'PREVIA_NAO_APROVADA');
  const comPrevia = fechar(novo, 'previa', 'aprovado');
  assert.equal(conferirEntrega(comPrevia).codigo, 'AVALIACAO_FALTANDO');
  // As três rodadas do teste no Codex: 7,3, 8,3 e 8,2. Entregou mesmo assim.
  const tresRodadas = avaliar(avaliar(avaliar(comPrevia, 7.3), 8.3), 8.2);
  const bloqueio = conferirEntrega(tresRodadas);
  assert.equal(bloqueio.codigo, 'NOTA_ABAIXO_DO_MINIMO');
  assert.equal(bloqueio.dados.nota, 8.2);
  assert.equal(bloqueio.dados.rodada, 3);
});

test('entrega: passa com 8,5 ou com "postar assim" do aluno; "parece cópia" barra', () => {
  const comPrevia = fechar(estadoNovo('p', 'P', 'B'), 'previa', 'aprovado');
  assert.equal(conferirEntrega(avaliar(comPrevia, 8.5)), null);
  assert.equal(conferirEntrega(avaliar(comPrevia, 9.1, true)).codigo, 'NOTA_ABAIXO_DO_MINIMO');
  const abaixo = avaliar(comPrevia, 8.2);
  assert.equal(conferirEntrega(fechar(abaixo, 'postar_assim', 'sim', 'Postar assim')), null);
});

test('música: precisa da resposta do aluno, salvo repetir a mesma escolha já gravada', () => {
  const novo = estadoNovo('p', 'P', 'B');
  assert.deepEqual(conferirMusica(novo, 'opcao-1:equilibrada', undefined), { codigo: 'MUSICA_NAO_ESCOLHIDA', dados: { escolha: 'opcao-1:equilibrada' } });
  assert.equal(conferirMusica(novo, 'opcao-1:equilibrada', 'Quero a 1'), null);
  const escolhida = fechar(novo, 'trilha', 'opcao-1:equilibrada', 'Quero a 1');
  assert.equal(conferirMusica(escolhida, 'opcao-1:equilibrada', undefined), null);
  assert.equal(conferirMusica(escolhida, 'opcao-2:abafada', undefined).codigo, 'MUSICA_NAO_ESCOLHIDA');
});

test('área protegida: pela variável do Codex ou pelo rastro do Chrome', () => {
  assert.equal(emAreaProtegida({ CODEX_SANDBOX: 'seatbelt' }), true);
  assert.equal(emAreaProtegida({}), false);
  const rastro = 'FATAL:sandbox_parameters_mac.mm(29)] Check failed';
  assert.equal(erroDeAreaProtegida(rastro), true);
  assert.equal(codigoDoNavegador(rastro, {}), 'AREA_PROTEGIDA');
  assert.equal(codigoDoNavegador('qualquer outro erro', { CODEX_SANDBOX: 'seatbelt' }), 'AREA_PROTEGIDA');
  assert.equal(codigoDoNavegador('qualquer outro erro', {}), 'CHROME_NAO_ABRIU');
});

test('limitador final fica abaixo do pico máximo, com folga para o pico verdadeiro', () => {
  assert.ok(SOM.limiterDbfs <= SOM.picoMaxDbtp - 0.5);
  assert.ok(grafoFinal(0).includes('alimiter=limit=0.794:'));
  assert.ok(grafoFinal(0, -3).includes('alimiter=limit=0.708:'));
});
