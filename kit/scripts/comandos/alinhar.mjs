// Acerta os tempos da tabela de cenas pela fala real: início e fim de cada cena, ênfases, sons e telas.
import { abrirProjeto, mudarEtapa, exigirArquivo } from '../lib/projeto.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { aviso } from '../lib/saida.mjs';
import { normalizar, palavras as separar, arred } from '../lib/texto.mjs';
import { sondar, resumoDoVideo } from '../lib/ffmpeg.mjs';
import { RITMO } from '../lib/regras.mjs';

const r3 = (n) => arred(n, 3);
const fichas = (texto) => separar(normalizar(texto));

function casaEm(T, F, pos, k) {
  for (let j = 0; j < k; j += 1) if (T[pos + j] !== F[j]) return false;
  return true;
}

// Procura a sequência de palavras da cena na transcrição a partir do cursor.
export function acharSequencia(T, F, cursor) {
  if (!F.length) return null;
  const k = Math.min(3, F.length);
  for (let s = cursor; s + k <= T.length; s += 1) {
    if (!casaEm(T, F, s, k)) continue;
    const kf = Math.min(3, F.length);
    const finais = F.slice(F.length - kf);
    const esperado = s + F.length - 1;
    for (let d = 0; d <= 6; d += 1) {
      for (const e of [esperado + d, esperado - d]) {
        if (e < s + kf - 1 || e >= T.length) continue;
        if (casaEm(T, finais, e - kf + 1, kf)) return { inicio: s, fim: e };
      }
    }
    return { inicio: s, fim: Math.min(T.length - 1, esperado), aproximado: true };
  }
  return null;
}

export function alinharCenas(dados, transcricao, duracao) {
  const palavras = transcricao.palavras || [];
  const T = palavras.map((p) => normalizar(p.texto));
  const avisos = [];
  let cursor = 0;
  const achados = dados.cenas.map((c) => {
    const F = fichas(c.fala);
    const r = acharSequencia(T, F, cursor);
    if (!r) {
      avisos.push(aviso('CENA_SEM_CASAMENTO', { cena: c.id }));
      return null;
    }
    if (r.aproximado) avisos.push(aviso('CENA_APROXIMADA', { cena: c.id }));
    cursor = r.fim + 1;
    return { inicio: palavras[r.inicio].inicio, fim: palavras[r.fim].fim };
  });
  const cenas = dados.cenas.map((c, i) => {
    const a = achados[i];
    return { ...c, inicioAntigo: c.inicio, inicio: a ? a.inicio : c.inicio, fimFala: a ? a.fim : c.fim };
  });
  let inicio = 0;
  cenas.forEach((c, i) => {
    const prox = cenas[i + 1];
    const fimBruto = prox ? Math.min(prox.inicio, duracao) : duracao;
    const fim = Math.max(inicio + 0.2, fimBruto);
    c.inicio = r3(inicio);
    c.fim = r3(fim);
    inicio = fim;
  });
  const telasPorId = new Map((dados.telas || []).map((t) => [t.id, { ...t }]));
  const finais = cenas.map((c) => {
    const delta = c.inicio - c.inicioAntigo;
    const enfase = (c.enfase || []).map((e) => {
      const alvo = normalizar(e.palavra);
      const p = palavras.find((w) => w.inicio >= c.inicio - 0.05 && w.inicio < c.fim && normalizar(w.texto) === alvo);
      if (!p) avisos.push(aviso('ENFASE_SEM_CASAMENTO', { cena: c.id, palavra: e.palavra }));
      return { palavra: e.palavra, inicio: r3(p ? p.inicio : c.inicio) };
    });
    const sons = (c.sons || []).map((s) => ({ ...s, em: r3(Math.min(c.fim, Math.max(0, s.em + delta))) }));
    const { inicioAntigo, fimFala, ...resto } = c;
    return { ...resto, enfase, sons };
  });
  for (const [id, tela] of telasPorId) {
    const usadas = finais.filter((c) => c.tela === id);
    if (!usadas.length) continue;
    const entra = usadas[0].inicio;
    const sai = Math.min(usadas[usadas.length - 1].fim, entra + RITMO.telaMaxS);
    telasPorId.set(id, { ...tela, entra: r3(entra), sai: r3(sai) });
  }
  const resultado = { ...dados, cenas: finais, telas: (dados.telas || []).map((t) => telasPorId.get(t.id)) };
  if (dados.cta && dados.cta.palavra) {
    const alvo = normalizar(dados.cta.palavra);
    const p = palavras.find((w) => w.inicio > duracao * 0.5 && normalizar(w.texto) === alvo);
    if (p) resultado.cta = { ...dados.cta, em: r3(p.inicio) };
    else avisos.push(aviso('CTA_SEM_CASAMENTO', { palavra: dados.cta.palavra }));
  }
  return { cenas: resultado, avisos };
}

export default async function alinhar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const dados = lerJson(exigirArquivo(projeto.arq('cenas.json')));
  const transcricao = lerJson(exigirArquivo(projeto.arq('transcricao.json')));
  const take = resumoDoVideo(await sondar(exigirArquivo(projeto.arq('take.mp4'))));
  const r = alinharCenas(dados, transcricao, take.duracao);
  escreverJson(projeto.arq('cenas.json'), r.cenas);
  mudarEtapa(projeto, 'alinhamento');
  return {
    ok: true,
    resumo: `Tempos de ${r.cenas.cenas.length} cenas acertados pela fala.`,
    avisos: r.avisos,
    arquivos: { cenas: projeto.rel('cenas.json') },
    dados: { cenas: r.cenas.cenas.length, avisos: r.avisos.length, duracao_s: take.duracao },
  };
}
