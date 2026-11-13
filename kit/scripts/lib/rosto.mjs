// Onde está o rosto no take: medida do YuNet (kit/py/rosto.py) e o que o kit decide com ela.
// - origem do zoom no centro do rosto (o rosto cresce no lugar, sem descer para fora da tela);
// - altura da legenda com o rosto cheio: abaixo do lábio se couber, senão acima da cabeça;
// - conferência: legenda entre os olhos e o lábio reprova (regra 39);
// - vídeo deitado: o recorte 9:16 vai para onde está o rosto, não para o meio.
// As contas são puras; só medirRosto e lerRosto tocam em arquivo.
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';
import { ultimasLinhas } from './executar.mjs';
import { uv } from './fala.mjs';
import { lerJson } from './json.mjs';
import { LEGENDA_ROSTO_Y, MASTER, ROSTO } from './regras.mjs';
import { aviso } from './saida.mjs';
import { assinaturaDoTake } from './recorte.mjs';

const SCRIPT = path.join(KIT, 'py', 'rosto.py');
const TEMPO_MAXIMO_MS = 10 * 60 * 1000;

function percentil(valores, p) {
  if (!valores.length) return null;
  const ordem = [...valores].sort((a, b) => a - b);
  const i = Math.min(ordem.length - 1, Math.max(0, Math.round((p / 100) * (ordem.length - 1))));
  return ordem[i];
}

const mediana = (valores) => percentil(valores, 50);

// Resumo da medida: o que vale para o vídeo todo, usando o rosto mais baixo, mais alto etc.
export function resumoDoRosto(medida, regras = ROSTO) {
  const amostras = medida?.amostras || [];
  const com = amostras.map((a) => a.rosto).filter(Boolean);
  const presenca = amostras.length ? com.length / amostras.length : 0;
  if (!com.length) return { presenca: 0, amostras: amostras.length };
  const bocaDeBaixo = (r) => Math.max(r.boca_d[1], r.boca_e[1]) + regras.labioAbaixoDaBoca * r.a;
  return {
    presenca: Math.round(presenca * 100) / 100,
    amostras: amostras.length,
    centro: { x: Math.round(mediana(com.map((r) => r.x + r.l / 2))), y: Math.round(mediana(com.map((r) => r.nariz[1]))) },
    olhos_y: Math.round(percentil(com.map((r) => Math.min(r.olho_d[1], r.olho_e[1]) - regras.testaAcimaDosOlhos * r.a), 5)),
    labio_y: Math.round(percentil(com.map(bocaDeBaixo), 95)),
    cabeca_y: Math.round(percentil(com.map((r) => r.y - regras.cabecaAcimaDaCaixa * r.a), 5)),
  };
}

const medidaBoa = (resumo, regras) => Boolean(resumo?.centro) && resumo.presenca >= regras.presencaMinima;

// Onde um ponto do take vai parar no pico do zoom em volta do centro do rosto.
const noZoom = (y, resumo, regras) => resumo.centro.y + (y - resumo.centro.y) * regras.zoomPico;

// Faixa da tela (y de cima e de baixo) que a legenda não pode cobrir: dos olhos ao lábio.
export function faixaDoRosto(resumo, regras = ROSTO) {
  if (!medidaBoa(resumo, regras)) return null;
  return { de: Math.round(noZoom(resumo.olhos_y, resumo, regras)), ate: Math.round(noZoom(resumo.labio_y, resumo, regras)) };
}

export function legendaSugerida(resumo, regras = ROSTO) {
  if (!medidaBoa(resumo, regras)) return null;
  const abaixo = Math.round(noZoom(resumo.labio_y, resumo, regras) + regras.folgaLegendaPx);
  if (abaixo <= LEGENDA_ROSTO_Y.max) return Math.max(LEGENDA_ROSTO_Y.min, abaixo);
  const acima = Math.round(noZoom(resumo.cabeca_y, resumo, regras) - regras.alturaLegendaPx - regras.folgaLegendaPx);
  return acima >= LEGENDA_ROSTO_Y.min ? acima : null;
}

// null quando está tudo certo (ou sem medida boa); senão o que está errado e a sugestão.
export function conferirLegendaNoRosto(legendaY, resumo, regras = ROSTO) {
  const faixa = faixaDoRosto(resumo, regras);
  if (!faixa || typeof legendaY !== 'number') return null;
  const cobre = legendaY < faixa.ate && faixa.de < legendaY + regras.alturaLegendaPx;
  return cobre ? { legenda_rosto_y: legendaY, rosto_de: faixa.de, rosto_ate: faixa.ate, sugerida: legendaSugerida(resumo, regras) } : null;
}

export function origemDoZoom(resumo, regras = ROSTO) {
  if (!medidaBoa(resumo, regras)) return null;
  const preso = (v, max) => Math.min(max, Math.max(0, v));
  return { x: preso(resumo.centro.x, MASTER.largura), y: preso(resumo.centro.y, MASTER.altura) };
}

// Vídeo deitado: depois de ampliar para cobrir 1080x1920, de onde começa o recorte na largura.
export function cortePeloRosto(resumo, largura, altura, regras = ROSTO) {
  if (!medidaBoa(resumo, regras) || !(largura > altura)) return null;
  const k = Math.max(MASTER.largura / largura, MASTER.altura / altura);
  const sobra = Math.round(largura * k) - MASTER.largura;
  return Math.round(Math.min(sobra, Math.max(0, resumo.centro.x * k - MASTER.largura / 2)));
}

// Roda o detector. Devolve { medida } ou { erro } (nunca derruba o comando: sem medida o kit
// segue como antes e avisa).
export async function medirRosto(entrada, saida, { trechos = null, rotacao = 0 } = {}) {
  const args = ['--entrada', entrada, '--saida', saida, '--intervalo', String(ROSTO.intervaloS), '--rotacao', String(rotacao)];
  if (trechos) args.push('--trechos', trechos.map((t) => `${t.inicio}-${t.fim}`).join(','));
  const r = await uv(args, TEMPO_MAXIMO_MS, { script: SCRIPT, semInternet: true });
  if (r.codigo !== 0 || !fs.existsSync(saida)) return { erro: ultimasLinhas(r.erro || r.saida, 6) };
  return { medida: lerJson(saida) };
}

// rosto.json do projeto, só se for do take atual.
export function lerRosto(arquivo, assinatura) {
  if (!fs.existsSync(arquivo)) return null;
  const dados = lerJson(arquivo);
  return dados.take === assinatura ? dados : null;
}

// Mede o rosto no take do projeto e grava rosto.json preso a este take. Devolve o resumo curto
// para a saída do comando (ou null) e põe em "avisos" o que faltou.
export async function medirRostoDoTake(projeto, avisos) {
  const arq = projeto.arq('rosto.json');
  const take = projeto.arq('take.mp4');
  const r = await medirRosto(take, arq);
  if (!r.medida) {
    avisos.push(aviso('ROSTO_NAO_MEDIDO', { onde: 'take', detalhe: r.erro }));
    return null;
  }
  const resumo = resumoDoRosto(r.medida);
  const sugerida = legendaSugerida(resumo);
  fs.writeFileSync(arq, `${JSON.stringify({ take: assinaturaDoTake(take), resumo, legenda_rosto_y_sugerida: sugerida, ...r.medida })}\n`, 'utf8');
  if (resumo.presenca < ROSTO.presencaMinima) {
    avisos.push(aviso('ROSTO_NAO_MEDIDO', { onde: 'take', detalhe: `rosto em ${Math.round(resumo.presenca * 100)}% do vídeo` }));
  }
  return { presenca: resumo.presenca, centro: resumo.centro || null, legenda_rosto_y_sugerida: sugerida };
}
