// Aplica as correções de escuta (nomes, números, termos) e gera transcricao.json.
import fs from 'node:fs';
import { abrirProjeto, exigirArquivo } from '../lib/projeto.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { validarCom } from '../lib/validar.mjs';
import { reprovado, aviso } from '../lib/saida.mjs';
import { normalizar, pontuacaoFinal } from '../lib/texto.mjs';

export function aplicar(transcricao, correcoes) {
  const palavras = transcricao.palavras.map((p) => ({ ...p }));
  const avisos = [];
  let aplicadas = 0;
  for (const c of correcoes) {
    const alvo = normalizar(c.de);
    const i = palavras.findIndex((p) => !p.removida && Math.abs(p.inicio - c.inicio) < 0.08 && normalizar(p.texto) === alvo);
    if (i === -1) {
      avisos.push(aviso('CORRECAO_NAO_CASOU', { inicio: c.inicio, de: c.de, para: c.para }));
      continue;
    }
    aplicadas += 1;
    if (!String(c.para).trim()) {
      palavras[i].removida = true;
      continue;
    }
    const pont = pontuacaoFinal(palavras[i].texto);
    const para = String(c.para).trim();
    palavras[i].texto = pont && !pontuacaoFinal(para) ? `${para}${pont}` : para;
  }
  const finais = palavras.filter((p) => !p.removida).map(({ removida, ...p }) => p);
  const segmentos = (transcricao.segmentos || []).map((s) => ({
    ...s,
    texto: finais.filter((p) => p.inicio >= s.inicio - 0.01 && p.inicio < s.fim).map((p) => p.texto).join(' '),
  }));
  return { transcricao: { ...transcricao, palavras: finais, segmentos }, avisos, aplicadas };
}

export default async function aplicarCorrecoes({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const take = lerJson(exigirArquivo(projeto.arq('transcricao-take.json')));
  const arqCorr = projeto.arq('correcoes.json');
  const correcoes = fs.existsSync(arqCorr) ? lerJson(arqCorr) : [];
  const erros = validarCom('correcoes', correcoes);
  if (erros.length) reprovado('ARQUIVO_INVALIDO', { arquivo: projeto.rel('correcoes.json'), problemas: erros.slice(0, 10) });
  const r = aplicar(take, correcoes);
  escreverJson(projeto.arq('transcricao.json'), r.transcricao);
  return {
    ok: true,
    resumo: `${r.aplicadas} correção(ões) aplicada(s).`,
    avisos: r.avisos,
    arquivos: { transcricao: projeto.rel('transcricao.json') },
    dados: { aplicadas: r.aplicadas, nao_casaram: r.avisos.length },
  };
}
