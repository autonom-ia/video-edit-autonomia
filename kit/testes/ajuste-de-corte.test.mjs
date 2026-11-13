// Ajuste das bordas dos trechos pelo mapa da fala. Os números vêm do vídeo real de 12/11/2026
// (bruto de 42 s, 23 pedaços de fala medidos pelo Silero VAD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajustarTrechos, mapaComPalavras } from '../scripts/lib/ajuste-de-corte.mjs';
import { sobrepostos } from '../scripts/comandos/cortar.mjs';
import { CORTE_FALA } from '../scripts/lib/regras.mjs';

const FALA_REAL = [
  [0.64, 2.08], [2.304, 2.88], [3.072, 4.064], [4.384, 5.6], [6.144, 7.808], [8.48, 9.088], [9.536, 10.272],
  [10.432, 11.04], [11.584, 12.896], [13.088, 14.496], [15.424, 16.544], [16.896, 17.376], [18.176, 19.136],
  [19.648, 20.96], [21.792, 23.648], [24.704, 26.016], [26.464, 27.776], [29.344, 30.336], [30.848, 31.68],
  [32.32, 33.216], [33.376, 35.776], [36.96, 38.112], [38.496, 39.904],
].map(([inicio, fim]) => ({ inicio, fim }));
const DURACAO = 42.0;
const transcricao = (fala = FALA_REAL, palavras = []) => ({ duracao_s: DURACAO, palavras, fala });
const codigos = (r) => r.avisos.map((a) => a.codigo);
const perto = (a, b) => Math.abs(a - b) < 0.002;

test('apara o silêncio do começo e completa a folga do fim (gancho do vídeo real)', () => {
  const r = ajustarTrechos([{ inicio: 0.12, fim: 5.62 }], transcricao(), DURACAO);
  assert.ok(perto(r.trechos[0].inicio, 0.64 - CORTE_FALA.folgaAntesS), `início ${r.trechos[0].inicio}`);
  assert.ok(perto(r.trechos[0].fim, 5.6 + CORTE_FALA.folgaDepoisS), `fim ${r.trechos[0].fim}`);
  assert.deepEqual(r.problemas, []);
});

test('estica o fim que caiu perto do fim da fala, mesmo com o trecho seguinte colado no bruto', () => {
  // Trecho "Frase 2." terminava em 18,93 s, no meio da fala que vai até 19,136 s. O trecho
  // seguinte começa em 19,16 s, mas a fala dele só começa em 19,648 s: dá para esticar.
  const r = ajustarTrechos([{ inicio: 17.88, fim: 18.93 }, { inicio: 19.16, fim: 20.95 }], transcricao(), DURACAO);
  assert.ok(perto(r.trechos[0].fim, 19.136 + CORTE_FALA.folgaDepoisS), `fim ${r.trechos[0].fim}`);
  assert.ok(r.trechos[0].fim < r.trechos[1].inicio, 'os dois trechos não podem se sobrepor');
  assert.ok(r.ajustes[0].o_que.includes('fim esticado até a fala acabar'));
});

test('não estica para dentro de fala que já sai em outro trecho', () => {
  const fala = [{ inicio: 1, fim: 2 }];
  const palavras = [{ texto: 'meio', inicio: 1.7, fim: 1.95 }];
  const r = ajustarTrechos([{ inicio: 0.9, fim: 1.8 }, { inicio: 1.85, fim: 2.2 }], transcricao(fala, palavras), DURACAO);
  assert.equal(r.trechos[0].fim, 1.8, 'a borda fica onde estava');
  // Os dois trechos partem a palavra "meio" (1,7 a 1,95 s): os dois reprovam.
  assert.deepEqual(r.problemas.map((p) => p.onde), ['trechos[0]', 'trechos[1]']);
});

test('reprova o corte no meio de uma palavra, longe da beira da fala', () => {
  const palavras = [{ texto: 'legenda', inicio: 34.4, fim: 34.7 }];
  const r = ajustarTrechos([{ inicio: 32.34, fim: 34.55 }], transcricao(FALA_REAL, palavras), DURACAO);
  assert.equal(r.problemas.length, 1);
  assert.equal(r.problemas[0].onde, 'trechos[0]');
  assert.ok(r.problemas[0].problema.includes('34.55'));
});

test('borda dentro da fala mas entre palavras: fica onde está e avisa para ouvir', () => {
  const palavras = [{ texto: 'corta,', inicio: 34.1, fim: 34.5 }, { texto: 'legenda', inicio: 34.56, fim: 34.9 }];
  const r = ajustarTrechos([{ inicio: 32.34, fim: 34.53 }], transcricao(FALA_REAL, palavras), DURACAO);
  assert.deepEqual(r.problemas, []);
  assert.equal(r.trechos[0].fim, 34.53);
  assert.ok(codigos(r).includes('CORTE_JUSTO'));
});

test('avisa o respiro longo de dentro do trecho, com o instante no bruto', () => {
  const r = ajustarTrechos([{ inicio: 6.06, fim: 11.03 }], transcricao(), DURACAO);
  const respiro = r.avisos.find((a) => a.codigo === 'RESPIRO_LONGO');
  assert.ok(respiro, 'pausa de 0,67 s em 7,8 s');
  assert.equal(respiro.dados.em_s, 7.808);
  assert.equal(respiro.dados.duracao_s, 0.672);
});

test('a folga nunca passa do meio do silêncio até a fala vizinha', () => {
  const fala = [{ inicio: 1, fim: 2 }, { inicio: 2.1, fim: 3 }];
  const r = ajustarTrechos([{ inicio: 0.5, fim: 2.0 }], transcricao(fala), DURACAO);
  assert.ok(perto(r.trechos[0].fim, 2.05), `fim ${r.trechos[0].fim}`);
});

test('trecho sem fala fica como está e avisa', () => {
  const r = ajustarTrechos([{ inicio: 40.2, fim: 41.5 }], transcricao(), DURACAO);
  assert.deepEqual(r.trechos[0], { inicio: 40.2, fim: 41.5 });
  assert.ok(codigos(r).includes('TRECHO_SEM_FALA'));
});

test('transcrição antiga, sem mapa da fala: trechos intactos e aviso', () => {
  const r = ajustarTrechos([{ inicio: 0.12, fim: 5.62 }], { duracao_s: DURACAO, palavras: [] }, DURACAO);
  assert.deepEqual(r.trechos, [{ inicio: 0.12, fim: 5.62 }]);
  assert.deepEqual(codigos(r), ['SEM_MAPA_DE_FALA']);
});

test('não mexe nos trechos recebidos e guarda o motivo', () => {
  const entrada = [{ inicio: 0.12, fim: 5.62, motivo: 'gancho' }];
  const copia = structuredClone(entrada);
  const r = ajustarTrechos(entrada, transcricao(), DURACAO);
  assert.deepEqual(entrada, copia);
  assert.equal(r.trechos[0].motivo, 'gancho');
});

test('o vídeo real inteiro passa sem reprovação e sem sobrepor trechos', () => {
  const trechos = [
    [0.12, 5.62], [6.06, 11.03], [11.26, 14.51], [15.16, 17.37], [17.88, 18.93], [19.16, 20.95], [21.16, 23.37],
    [24.44, 27.83], [28.86, 31.69], [32.34, 35.77], [36.56, 38.17], [38.4, 39.91],
  ].map(([inicio, fim]) => ({ inicio, fim }));
  const r = ajustarTrechos(trechos, transcricao(), DURACAO);
  assert.deepEqual(r.problemas, []);
  for (let k = 1; k < r.trechos.length; k += 1) assert.ok(r.trechos[k - 1].fim <= r.trechos[k].inicio, `trechos ${k - 1} e ${k}`);
  // Pausas de mais de 0,4 s dentro dos trechos 1 (duas), 7 e 8: as mesmas que se ouvem no take.
  const respiros = r.avisos.filter((a) => a.codigo === 'RESPIRO_LONGO').map((a) => [a.dados.trecho, a.dados.em_s]);
  assert.deepEqual(respiros, [[1, 7.808], [1, 9.088], [7, 26.016], [8, 30.336]]);
  assert.deepEqual([...new Set(codigos(r))], ['RESPIRO_LONGO']);
});

test('palavra que o detector perdeu não é apagada ao aparar o silêncio (achado do revisor)', () => {
  // "não" de 10,00 a 10,40 s fora do mapa; o trecho começa em 10,20 e a próxima fala é em 10,90.
  const fala = [{ inicio: 10.9, fim: 12 }];
  const palavras = [{ texto: 'não', inicio: 10.0, fim: 10.4 }, { texto: 'sei', inicio: 10.9, fim: 11.3 }];
  const r = ajustarTrechos([{ inicio: 10.2, fim: 12.2 }], transcricao(fala, palavras), DURACAO);
  // A palavra entra no mapa; o início caiu perto do começo dela e é recuado até antes dela.
  assert.ok(perto(r.trechos[0].inicio, 10.0 - CORTE_FALA.folgaAntesS), `início ${r.trechos[0].inicio}`);
  assert.deepEqual(r.problemas, []);
});

test('mapaComPalavras só acrescenta palavra que não encosta em fala', () => {
  const fala = [{ inicio: 1, fim: 2 }];
  const palavras = [{ texto: 'a', inicio: 1.5, fim: 1.8 }, { texto: 'b', inicio: 3, fim: 3.2 }];
  assert.deepEqual(mapaComPalavras(fala, palavras), [{ inicio: 1, fim: 2 }, { inicio: 3, fim: 3.2 }]);
});

test('trechos com pedaço em comum reprovam; ordem trocada sem pedaço em comum passa', () => {
  assert.equal(sobrepostos([{ inicio: 10, fim: 12 }, { inicio: 11, fim: 14 }]).length, 1);
  assert.deepEqual(sobrepostos([{ inicio: 20, fim: 22 }, { inicio: 1, fim: 5 }, { inicio: 5, fim: 8 }]), []);
});
