// Confere o texto do post: primeira linha curta, poucas hashtags, sem link e com a palavra do pedido.
import fs from 'node:fs';
import { daRaiz } from '../lib/caminhos.mjs';
import { exigir } from '../lib/args.mjs';
import { falha, reprovado } from '../lib/saida.mjs';
import { lerBriefing } from '../lib/projeto.mjs';
import { palavras, linhas, normalizar, contemTermo } from '../lib/texto.mjs';
import { POSTAGEM } from '../lib/regras.mjs';

export function analisarLegenda(texto, palavraCta = '') {
  const primeira = linhas(texto).find((l) => l.trim()) || '';
  const tokens = palavras(texto);
  const hashtags = tokens.filter((t) => t.startsWith('#') && t.length > 1).length;
  const baixo = texto.toLowerCase();
  const temLink = baixo.includes('http') || baixo.includes('www.');
  const palavraPresente = palavraCta ? contemTermo(normalizar(texto), palavraCta) : true;
  const problemas = [];
  const chars = [...primeira.trim()].length;
  if (chars > POSTAGEM.primeiraLinhaMax) problemas.push({ codigo: 'PRIMEIRA_LINHA_LONGA', dados: { caracteres: chars, maximo: POSTAGEM.primeiraLinhaMax } });
  if (hashtags > POSTAGEM.hashtagsMax) problemas.push({ codigo: 'HASHTAGS_DEMAIS', dados: { hashtags, maximo: POSTAGEM.hashtagsMax } });
  if (temLink) problemas.push({ codigo: 'LINK_NA_LEGENDA', dados: {} });
  if (!palavraPresente) problemas.push({ codigo: 'PALAVRA_DO_PEDIDO_FALTA', dados: { palavra: palavraCta } });
  return { primeira_linha_chars: chars, hashtags, tem_link: temLink, palavra_cta_presente: palavraPresente, problemas };
}

export default async function contarLegenda({ opcoes }) {
  const pedido = exigir(opcoes, 'arquivo');
  const arquivo = daRaiz(pedido);
  if (!fs.existsSync(arquivo)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  const b = lerBriefing(false);
  const palavraCta = b && b.cta && b.cta.tipo === 'comentar_palavra' ? b.cta.palavra || '' : '';
  const r = analisarLegenda(fs.readFileSync(arquivo, 'utf8'), palavraCta);
  if (r.problemas.length) reprovado('LEGENDA_REPROVADA', r);
  return { ok: true, resumo: 'Texto do post aprovado.', dados: r };
}
