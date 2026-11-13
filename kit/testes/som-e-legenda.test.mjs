// Issue #13: som batendo no quadro em que a tela aparece, pico dos sons de passagem no golpe,
// QA medindo o golpe e legenda dentro da zona segura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarTelas, planejarSons, alinharNaChegada, inicioDoSom, eventosDeFaixa } from '../scripts/lib/composicao.mjs';
import { validarCenas } from '../scripts/lib/cenas.mjs';
import { checarSonsNasTrocas } from '../scripts/lib/qa.mjs';
import { legendaY } from '../scripts/lib/legenda.mjs';
import { FAIXA, RITMO, SFX_PICO, ZONA_SEGURA } from '../scripts/lib/regras.mjs';

const ALTURA_MAX_LEGENDA = 75;
const APARECE = 5 - RITMO.antecipacaoCardS;

function dados(sons = []) {
  return {
    versao: 1,
    cenas: [
      { id: 'c01', fala: 'Abro o app', inicio: 0, fim: 5, faixa: 0, tela: null },
      { id: 'c02', fala: 'E ele responde', inicio: 5, fim: 9, faixa: 0, tela: 't01', sons },
    ],
    telas: [{ id: 't01', tipo: 'card', campos: { texto: 'Pronto' }, entra: 5, sai: 8 }],
  };
}

function sonsDe(d) {
  const r = montarTelas(d, null, { duracao: 10 });
  return planejarSons({ dados: d, eventosFaixa: [], telasInfo: r.info, zoomEv: [], cta: null, duracao: 10 });
}

test('som da cena no "entra" da tela vai para o quadro em que ela aparece', () => {
  const sons = sonsDe(dados([{ efeito: 'impacto-medio', em: 5, volume: 1 }]));
  const impacto = sons.find((s) => s.efeito === 'impacto-medio');
  assert.equal(impacto.golpe, Math.round(APARECE * 1000) / 1000);
  assert.equal(impacto.inicio, impacto.golpe, 'impacto bate no começo do arquivo');
});

test('som da cena longe da chegada fica onde a cena pôs', () => {
  const info = [{ entrada: APARECE, entra: 5 }];
  assert.equal(alinharNaChegada(6.2, info), 6.2);
  assert.equal(alinharNaChegada(5 + 1 / 30, info), APARECE, 'até 1 quadro depois do entra é chegada');
  assert.equal(alinharNaChegada(5.1, info), 5.1, 'virada ou clique 0,1 s depois fica');
});

test('com duas telas perto, o som vai para a chegada de "entra" mais perto', () => {
  const info = [{ entrada: 7.9, entra: 8.03 }, { entrada: 7.967, entra: 8.1 }];
  assert.equal(alinharNaChegada(8.1, info), 7.967);
  assert.equal(alinharNaChegada(8.03, info), 7.9);
});

test('impacto da cena 0,1 s depois do entra não apaga o som automático da chegada', () => {
  const sons = sonsDe(dados([{ efeito: 'impacto-medio', em: 5.1, volume: 1.2 }]));
  assert.ok(sons.some((s) => s.efeito === 'impacto-medio' && s.golpe === 5.1));
  assert.ok(sons.some((s) => s.motivo === 'tela t01' && s.efeito === 'swish'));
});

test('perto do zero o golpe registrado é o pico real', () => {
  const d = dados();
  d.telas[0].entra = 0.2;
  d.cenas[1].inicio = 0;
  d.cenas = [d.cenas[1]];
  const r = montarTelas(d, null, { duracao: 10 });
  const midia = planejarSons({ dados: { ...d, cenas: [{ ...d.cenas[0], sons: [{ efeito: 'whoosh-medio', em: 0.1 }] }] }, eventosFaixa: [], telasInfo: r.info, zoomEv: [], cta: null, duracao: 10 })
    .find((s) => s.efeito === 'whoosh-medio');
  assert.equal(midia.inicio, 0);
  assert.equal(midia.golpe, SFX_PICO['whoosh-medio']);
});

test('integração: os sons planejados passam no QA das trocas', () => {
  for (const sons of [[], [{ efeito: 'impacto-medio', em: 5 }], [{ efeito: 'whoosh-rapido', em: 5 }], [{ efeito: 'pop', em: 5.1 }]]) {
    const d = dados(sons);
    assert.deepEqual(checarSonsNasTrocas(d.telas, sonsDe(d)), [], JSON.stringify(sons));
  }
});

test('QA: sons.json antigo, sem golpe, usa o começo mais o pico', () => {
  const telas = [{ id: 't01', entra: 5 }];
  assert.equal(checarSonsNasTrocas(telas, [{ efeito: 'swish', inicio: APARECE - SFX_PICO.swish }]).length, 0);
  assert.equal(checarSonsNasTrocas(telas, [{ efeito: 'swish', inicio: 5 }]).length, 1);
});

test('som de passagem começa antes para o pico cair no golpe', () => {
  for (const [efeito, pico] of Object.entries(SFX_PICO)) {
    assert.equal(inicioDoSom(efeito, 3), 3 - pico);
  }
  assert.equal(inicioDoSom('pop', 3), 3);
  assert.equal(inicioDoSom('whoosh-medio', 0.1), 0, 'nunca antes do zero');
});

test('som automático da entrada bate no quadro em que a tela aparece', () => {
  const sons = sonsDe(dados());
  const entrada = sons.find((s) => s.motivo === 'tela t01' && s.efeito === 'swish');
  assert.equal(entrada.golpe, Math.round(APARECE * 1000) / 1000);
  assert.equal(entrada.inicio, Math.round((APARECE - SFX_PICO.swish) * 1000) / 1000);
});

test('som da cena na chegada substitui o automático sem atrasar', () => {
  const sons = sonsDe(dados([{ efeito: 'whoosh-rapido', em: 5, volume: 0.8 }]));
  const naChegada = sons.filter((s) => Math.abs(s.golpe - APARECE) < 0.15);
  assert.deepEqual(naChegada.map((s) => s.efeito), ['whoosh-rapido']);
  assert.equal(naChegada[0].inicio, Math.round((APARECE - SFX_PICO['whoosh-rapido']) * 1000) / 1000);
});

test('QA: som 4 quadros atrasado reprova; som no quadro em que a tela aparece passa', () => {
  const telas = [{ id: 't01', entra: 5 }];
  assert.equal(checarSonsNasTrocas(telas, [{ inicio: 5, golpe: 5 }]).length, 1);
  assert.equal(checarSonsNasTrocas(telas, [{ inicio: APARECE - 0.07, golpe: APARECE }]).length, 0);
});

test('legenda termina dentro da zona segura em todas as faixas', () => {
  for (const faixa of FAIXA.valores) {
    assert.ok(legendaY(faixa) + ALTURA_MAX_LEGENDA <= ZONA_SEGURA.base, `faixa ${faixa}: ${legendaY(faixa)}`);
  }
});

test('legenda do rosto cheio usa a altura escolhida no cenas.json; as outras faixas não mudam', () => {
  assert.equal(legendaY(0, 760), 760);
  assert.equal(legendaY(0), FAIXA.legendaY[0]);
  assert.equal(legendaY(50, 760), FAIXA.legendaY[50]);
  const ev = eventosDeFaixa([{ id: 'c01', inicio: 0, fim: 3, faixa: 0 }, { id: 'c02', inicio: 3, fim: 6, faixa: 50 }], null, 760);
  assert.deepEqual(ev.map((e) => e.capY), [760, FAIXA.legendaY[50]]);
});

test('cenas.json: legenda_rosto_y fora da zona segura reprova', () => {
  const base = { versao: 1, duracao_alvo_s: 10, titulo_gancho: { texto: 'Este Reel saiu de 3 frases' }, cenas: [{ id: 'c01', fala: 'Oi', inicio: 0, fim: 3, faixa: 0, tela: null }], telas: [] };
  const sobre = (v) => validarCenas({ ...base, legenda_rosto_y: v }).problemas.filter((p) => p.onde === 'legenda_rosto_y');
  assert.equal(sobre(1600).length, 1);
  assert.equal(sobre(100).length, 1);
  assert.equal(sobre('alto').length, 1);
  assert.equal(sobre(760).length, 0);
  assert.equal(validarCenas(base).problemas.filter((p) => p.onde === 'legenda_rosto_y').length, 0);
});
