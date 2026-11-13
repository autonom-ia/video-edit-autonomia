// Ajusta as bordas dos trechos (trechos.json) pelo mapa da fala da transcrição do bruto.
// O assistente escolhe os trechos pelas palavras, que erram uns 100 ms; o mapa da fala
// (Silero VAD) acerta uns 30 ms. Para cada trecho o kit:
// 1. estica o fim (ou recua o início) que caiu perto da beira de uma fala;
// 2. reprova a borda que cai no meio de uma palavra, longe da beira da fala;
// 3. avisa a borda justa: dentro da fala, mas entre duas palavras (vale ouvir);
// 4. deixa a folga certa de silêncio nas pontas: apara o que sobra e completa o que falta,
//    sem passar do meio do silêncio até a fala vizinha;
// 5. avisa o respiro longo que ficou dentro do trecho.
// Função pura: devolve trechos novos, sem mexer nos que recebeu.
import { CORTE_FALA } from './regras.mjs';
import { arred } from './texto.mjs';
import { aviso } from './saida.mjs';

const r3 = (n) => arred(n, 3);

const falaQueContem = (fala, t, tol) => fala.find((f) => f.inicio + tol < t && t < f.fim - tol);
const palavraQueContem = (palavras, t, margem) => palavras.find((p) => p.inicio + margem < t && t < p.fim - margem);
const cruza = (de, ate, pedacos) => pedacos.some((p) => p.inicio < ate && de < p.fim);

// O detector pode perder palavra curta ou falada baixo. Palavra da transcrição que não encosta
// em nenhum pedaço de fala entra no mapa: aparar silêncio nunca pode apagar uma palavra.
export function mapaComPalavras(fala, palavras) {
  const encosta = (p) => fala.some((f) => f.inicio < p.fim && p.inicio < f.fim);
  const extras = palavras.filter((p) => p.fim > p.inicio && !encosta(p)).map((p) => ({ inicio: p.inicio, fim: p.fim }));
  return [...fala, ...extras].sort((a, b) => a.inicio - b.inicio);
}

// Pedaços de fala dentro de um intervalo, cortados nas bordas dele.
function falaDentro(fala, inicio, fim) {
  return fala
    .filter((f) => f.fim > inicio && f.inicio < fim)
    .map((f) => ({ inicio: Math.max(f.inicio, inicio), fim: Math.min(f.fim, fim) }));
}

// Passo 1 a 3 para uma borda. "lado" é 'inicio' ou 'fim'.
function conferirBorda(trecho, lado, ctx) {
  const { fala, palavras, falaDosOutros, regras } = ctx;
  const t = trecho[lado];
  const s = falaQueContem(fala, t, regras.toleranciaS);
  if (!s) return { t, livre: true };
  const alvo = lado === 'fim' ? s.fim : s.inicio;
  const limite = lado === 'fim' ? regras.esticarFimMaxS : regras.recuarInicioMaxS;
  if (Math.abs(alvo - t) <= limite && !cruza(Math.min(t, alvo), Math.max(t, alvo), falaDosOutros)) {
    return { t: alvo, livre: true, ajuste: lado === 'fim' ? 'fim esticado até a fala acabar' : 'início recuado até a fala começar' };
  }
  if (palavraQueContem(palavras, t, regras.margemPalavraS)) return { t, livre: false, problema: true };
  return { t, livre: false, justo: true };
}

// Passo 4: a borda livre vai para a folga certa, sem passar do meio do silêncio vizinho.
function comFolga(lado, pedacos, ctx) {
  const { fala, regras, duracao } = ctx;
  if (lado === 'inicio') {
    const voz = pedacos[0].inicio;
    const antes = fala.filter((f) => f.fim <= voz).at(-1);
    const piso = antes ? (antes.fim + voz) / 2 : 0;
    return Math.max(piso, voz - regras.folgaAntesS);
  }
  const voz = pedacos.at(-1).fim;
  const depois = fala.find((f) => f.inicio >= voz);
  const teto = depois ? (voz + depois.inicio) / 2 : duracao;
  return Math.min(teto, voz + regras.folgaDepoisS);
}

function descreverFolga(lado, de, para) {
  const dif = r3(Math.abs(para - de));
  const ponta = lado === 'inicio' ? 'começo' : 'fim';
  const encolheu = lado === 'inicio' ? para > de : para < de;
  return encolheu ? `${dif} s de silêncio aparados no ${ponta}` : `${dif} s de folga acrescentados no ${ponta}`;
}

function respirosLongos(pedacos, regras) {
  const longos = [];
  for (let k = 1; k < pedacos.length; k += 1) {
    const pausa = pedacos[k].inicio - pedacos[k - 1].fim;
    if (pausa > regras.respiroMaxS) longos.push({ em_s: r3(pedacos[k - 1].fim), duracao_s: r3(pausa) });
  }
  return longos;
}

function ajustarUm(trecho, i, ctx) {
  const saida = { ajustes: [], problemas: [], avisos: [] };
  const bordas = { inicio: conferirBorda(trecho, 'inicio', ctx), fim: conferirBorda(trecho, 'fim', ctx) };
  for (const lado of ['inicio', 'fim']) {
    const b = bordas[lado];
    const nome = lado === 'inicio' ? 'início' : 'fim';
    if (b.ajuste) saida.ajustes.push(b.ajuste);
    if (b.problema) saida.problemas.push({ onde: `trechos[${i}]`, problema: `o ${nome} (${trecho[lado]} s) corta uma palavra no meio; escolha a pausa antes ou depois dela` });
    if (b.justo) saida.avisos.push(aviso('CORTE_JUSTO', { trecho: i, borda: nome, instante_s: trecho[lado] }));
  }
  const pedacos = falaDentro(ctx.fala, bordas.inicio.t, bordas.fim.t);
  const novo = { inicio: bordas.inicio.t, fim: bordas.fim.t };
  if (!pedacos.length) saida.avisos.push(aviso('TRECHO_SEM_FALA', { trecho: i }));
  for (const lado of pedacos.length ? ['inicio', 'fim'] : []) {
    if (!bordas[lado].livre) continue;
    const alvo = comFolga(lado, pedacos, ctx);
    if (Math.abs(alvo - novo[lado]) <= ctx.regras.toleranciaS) continue;
    saida.ajustes.push(descreverFolga(lado, novo[lado], alvo));
    novo[lado] = alvo;
  }
  for (const r of respirosLongos(pedacos, ctx.regras)) saida.avisos.push(aviso('RESPIRO_LONGO', { trecho: i, ...r }));
  return { trecho: { ...trecho, inicio: r3(novo.inicio), fim: r3(novo.fim) }, ...saida };
}

export function ajustarTrechos(trechos, transcricao, duracao, regras = CORTE_FALA) {
  if (!Array.isArray(transcricao?.fala)) return { trechos: trechos.map((t) => ({ ...t })), ajustes: [], problemas: [], avisos: [aviso('SEM_MAPA_DE_FALA', {})] };
  const palavras = Array.isArray(transcricao.palavras) ? transcricao.palavras : [];
  const fala = mapaComPalavras(transcricao.fala, palavras);
  const resultado = { trechos: [], ajustes: [], problemas: [], avisos: [] };
  trechos.forEach((t, i) => {
    // A borda movida não pode engolir fala que já sai em outro trecho (sairia duas vezes).
    const falaDosOutros = trechos.filter((_, j) => j !== i).flatMap((o) => falaDentro(fala, o.inicio, o.fim));
    const um = ajustarUm(t, i, { fala, palavras, falaDosOutros, regras, duracao });
    resultado.trechos.push(um.trecho);
    if (um.ajustes.length) resultado.ajustes.push({ trecho: i, de: [t.inicio, t.fim], para: [um.trecho.inicio, um.trecho.fim], o_que: um.ajustes });
    resultado.problemas.push(...um.problemas);
    resultado.avisos.push(...um.avisos);
  });
  return resultado;
}
