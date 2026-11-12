// Mede o tempo de fala do roteiro: linhas que começam com "> " (2,75 palavras por segundo).
import fs from 'node:fs';
import { daRaiz } from '../lib/caminhos.mjs';
import { exigir } from '../lib/args.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { contarPalavras, linhas, arred } from '../lib/texto.mjs';
import { RITMO, DURACAO_ALVO } from '../lib/regras.mjs';
import { lerBriefing } from '../lib/projeto.mjs';

export function blocosDoRoteiro(texto) {
  const blocos = [];
  let atual = [];
  for (const linha of linhas(texto)) {
    const t = linha.trimStart();
    if (t.startsWith('> ') || t === '>') {
      atual.push(t.slice(1).trim());
    } else if (atual.length) {
      blocos.push(atual.join(' ').trim());
      atual = [];
    }
  }
  if (atual.length) blocos.push(atual.join(' ').trim());
  return blocos.filter(Boolean);
}

export function medirFala(texto) {
  const blocos = blocosDoRoteiro(texto).map((b) => ({ texto: b, segundos: arred(contarPalavras(b) / RITMO.palavrasPorSegundo, 1) }));
  const palavras = blocos.reduce((s, b) => s + contarPalavras(b.texto), 0);
  return { palavras, segundos: arred(palavras / RITMO.palavrasPorSegundo, 1), gancho_s: blocos.length ? blocos[0].segundos : 0, blocos };
}

export default async function tempoDeFala({ opcoes }) {
  const pedido = exigir(opcoes, 'arquivo');
  const arquivo = daRaiz(pedido);
  if (!fs.existsSync(arquivo)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  const dados = medirFala(fs.readFileSync(arquivo, 'utf8'));
  if (!dados.blocos.length) falha('ROTEIRO_SEM_FALA', { arquivo: pedido });
  const avisos = [];
  if (dados.gancho_s > RITMO.ganchoMaxS) avisos.push(aviso('GANCHO_LONGO', { segundos: dados.gancho_s, maximo: RITMO.ganchoMaxS }));
  const briefing = lerBriefing(false);
  const alvo = DURACAO_ALVO[(briefing && briefing.duracao_alvo) || 'medio'] || DURACAO_ALVO.medio;
  if (dados.segundos < alvo.min || dados.segundos > alvo.max) avisos.push(aviso('DURACAO_FORA_DO_ALVO', { segundos: dados.segundos, minimo: alvo.min, maximo: alvo.max }));
  return { ok: true, resumo: `Uns ${dados.segundos} segundos de fala, gancho de ${dados.gancho_s} s.`, avisos, dados: { ...dados, alvo } };
}
