// Medida do rosto (YuNet) e o que o kit decide com ela. Os números vêm do take real de
// 12/11/2026: rosto baixo no quadro, boca perto de y 1500.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumoDoRosto, legendaSugerida, conferirLegendaNoRosto, origemDoZoom, cortePeloRosto, faixaDoRosto } from '../scripts/lib/rosto.mjs';
import { grafoDeCorte } from '../scripts/comandos/cortar.mjs';
import { LEGENDA_ROSTO_Y } from '../scripts/lib/regras.mjs';

const ROSTO_BAIXO = { x: 309, y: 1027, l: 438, a: 602, conf: 0.93, olho_d: [429, 1272], olho_e: [638, 1258], nariz: [557, 1395], boca_d: [471, 1487], boca_e: [642, 1474] };
// Mesmo rosto, subido 700 px: cabe a legenda embaixo da boca.
const subir = (r, dy) => ({ ...r, y: r.y - dy, olho_d: [r.olho_d[0], r.olho_d[1] - dy], olho_e: [r.olho_e[0], r.olho_e[1] - dy], nariz: [r.nariz[0], r.nariz[1] - dy], boca_d: [r.boca_d[0], r.boca_d[1] - dy], boca_e: [r.boca_e[0], r.boca_e[1] - dy] });
const medida = (rostos) => ({ largura: 1080, altura: 1920, amostras: rostos.map((rosto, i) => ({ t: i * 0.5, rosto })) });

test('rosto baixo: a legenda vai para cima da cabeça, e o padrão antigo (1424) reprova', () => {
  const resumo = resumoDoRosto(medida([ROSTO_BAIXO, ROSTO_BAIXO, ROSTO_BAIXO]));
  const y = legendaSugerida(resumo);
  assert.ok(y >= LEGENDA_ROSTO_Y.min && y + 75 < faixaDoRosto(resumo).de, `sugerida ${y}`);
  const problema = conferirLegendaNoRosto(1424, resumo);
  assert.ok(problema, 'a legenda em 1424 cobre a boca');
  assert.equal(problema.sugerida, y);
  assert.equal(conferirLegendaNoRosto(y, resumo), null);
});

test('rosto no alto: a legenda vai logo abaixo do lábio', () => {
  const alto = subir(ROSTO_BAIXO, 700);
  const resumo = resumoDoRosto(medida([alto, alto]));
  const y = legendaSugerida(resumo);
  assert.ok(y > faixaDoRosto(resumo).ate && y <= LEGENDA_ROSTO_Y.max, `sugerida ${y}`);
});

test('a medida usa o pior caso: o lábio mais baixo e a cabeça mais alta do vídeo', () => {
  const resumo = resumoDoRosto(medida([ROSTO_BAIXO, subir(ROSTO_BAIXO, 100), subir(ROSTO_BAIXO, 50)]));
  const soBaixo = resumoDoRosto(medida([ROSTO_BAIXO]));
  const soAlto = resumoDoRosto(medida([subir(ROSTO_BAIXO, 100)]));
  assert.equal(resumo.labio_y, soBaixo.labio_y);
  assert.equal(resumo.cabeca_y, soAlto.cabeca_y);
});

test('a boca é conferida no maior zoom (abertura 1,26), não só no punch', () => {
  const resumo = resumoDoRosto(medida([subir(ROSTO_BAIXO, 700)]));
  const faixa = faixaDoRosto(resumo);
  const labioNoPunch = Math.round(resumo.centro.y + (resumo.labio_y - resumo.centro.y) * 1.16);
  assert.ok(faixa.ate > labioNoPunch, `faixa até ${faixa.ate}, punch ${labioNoPunch}`);
});

test('zoom cresce do centro do rosto', () => {
  const resumo = resumoDoRosto(medida([ROSTO_BAIXO]));
  assert.deepEqual(origemDoZoom(resumo), { x: 528, y: 1395 });
});

test('rosto em pouco do vídeo: sem sugestão, sem conferência e sem origem de zoom', () => {
  const resumo = resumoDoRosto(medida([ROSTO_BAIXO, null, null, null]));
  assert.equal(resumo.presenca, 0.25);
  assert.equal(legendaSugerida(resumo), null);
  assert.equal(conferirLegendaNoRosto(1424, resumo), null);
  assert.equal(origemDoZoom(resumo), null);
  assert.deepEqual(resumoDoRosto(medida([null, null])), { presenca: 0, amostras: 2 });
});

test('vídeo deitado: o recorte 9:16 segue o rosto e não sai da imagem', () => {
  const naDireita = resumoDoRosto(medida([{ ...ROSTO_BAIXO, x: 1400, l: 300 }]));
  // 1920x1080 ampliado para 3413x1920: rosto em x 1550 vira 2756; recorte começa em 2216.
  assert.equal(cortePeloRosto(naDireita, 1920, 1080), 2216);
  const naBorda = resumoDoRosto(medida([{ ...ROSTO_BAIXO, x: 1800, l: 120 }]));
  assert.equal(cortePeloRosto(naBorda, 1920, 1080), 3413 - 1080);
  assert.equal(cortePeloRosto(naDireita, 1080, 1920), null, 'vídeo em pé não muda');
});

test('grafo do corte: recorte no rosto só quando há medida', () => {
  const trechos = [{ inicio: 0, fim: 2 }];
  assert.ok(grafoDeCorte(trechos).includes('crop=1080:1920,'));
  assert.ok(grafoDeCorte(trechos, { cortarX: 2216 }).includes('crop=1080:1920:2216:0,'));
});

test('o modelo do rosto que vai no estúdio é o do OpenCV Zoo (sha256 conferido)', async () => {
  const { createHash } = await import('node:crypto');
  const fs = await import('node:fs');
  const arquivo = new URL('../py/modelos/face_detection_yunet_2023mar.onnx', import.meta.url);
  const sha = createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
  assert.equal(sha, '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4');
});
