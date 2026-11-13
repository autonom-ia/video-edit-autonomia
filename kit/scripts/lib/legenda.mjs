// Legenda palavra por palavra: grupos de 1 a 3 palavras, cor e posição por faixa (spec D.6).
import { LEGENDA, FAIXA } from './regras.mjs';
import { terminaComPontuacao } from './texto.mjs';

const tamanhoDoGrupo = (grupo) => grupo.reduce((soma, p, i) => soma + [...p.texto].length + (i ? 1 : 0), 0);

// palavras: [{texto, inicio, fim}] em ordem. Devolve [[palavra, ...], ...].
export function gruposDeLegenda(palavras) {
  const grupos = [];
  let atual = [];
  const fechar = () => {
    if (atual.length) grupos.push(atual);
    atual = [];
  };
  palavras.forEach((p, i) => {
    if (atual.length && tamanhoDoGrupo([...atual, p]) > LEGENDA.maxCaracteres) fechar();
    atual.push(p);
    const proxima = palavras[i + 1];
    const pausa = proxima ? proxima.inicio - p.fim : Infinity;
    if (
      atual.length >= LEGENDA.maxPalavras ||
      terminaComPontuacao(p.texto, LEGENDA.pontuacaoQuebra) ||
      pausa >= LEGENDA.pausaQuebraS
    ) {
      fechar();
    }
  });
  fechar();
  return grupos;
}

// Quando cada grupo aparece e some.
export function tempoDosGrupos(grupos) {
  return grupos.map((g, i) => {
    const inicio = i === 0 ? 0 : Math.max(0.05, g[0].inicio - LEGENDA.antesS);
    let fim = g[g.length - 1].fim + LEGENDA.depoisS;
    const prox = grupos[i + 1];
    if (prox) fim = Math.min(fim, Math.max(0.05, prox[0].inicio - LEGENDA.antesS) - 0.02);
    return { inicio: Math.round(inicio * 1000) / 1000, fim: Math.round(Math.max(fim, inicio + 0.1) * 1000) / 1000 };
  });
}

// rostoY: legenda_rosto_y do cenas.json, só para o rosto cheio (faixa 0).
export function legendaY(faixa, rostoY) {
  if (faixa === 0 && typeof rostoY === 'number') return rostoY;
  return FAIXA.legendaY[faixa] ?? FAIXA.legendaY[0];
}

// Tinta sobre a faixa clara (faixa 100); clara com sombra sobre o rosto.
export function corDaLegenda(faixa, marca) {
  if (faixa === 100) return { texto: marca.cores.tinta, sombra: 'rgba(0,0,0,0)' };
  return { texto: '#FFFFFF', sombra: 'rgba(0,0,0,0.6)' };
}
