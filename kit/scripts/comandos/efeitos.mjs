// Lista os efeitos de cena do kit: o que cada um faz, quando usar, se precisa de recorte, se deixa
// o rosto pequeno, quanto tempo pede e os campos. É daqui que o assistente escolhe, pelo sentido da
// fala, se uma cena pede efeito e qual. Nenhuma escolha é automática.
import { catalogo, arquivosDoEfeito } from '../lib/efeitos.mjs';
import { EFEITOS_DE_CENA } from '../lib/regras.mjs';

export default async function efeitos() {
  const lista = Object.values(catalogo()).map((f) => ({
    nome: f.nome,
    titulo: f.titulo,
    funcao: f.funcao,
    recorte: f.recorte,
    rosto_pequeno: f.rosto_pequeno,
    duracao: f.duracao,
    campos: f.campos || {},
    pronto: Boolean(arquivosDoEfeito(f.nome).js),
  }));
  return {
    ok: true,
    resumo: `${lista.length} efeitos de cena. No máximo 1 a cada ${EFEITOS_DE_CENA.segundosPorEfeito} s de vídeo, com "porque" ligado à fala.`,
    dados: { regra: { segundos_por_efeito: EFEITOS_DE_CENA.segundosPorEfeito, porque_min_palavras: EFEITOS_DE_CENA.porqueMinPalavras }, efeitos: lista },
  };
}
