// Monta os dados da composição do Reel (5 camadas): take, legenda palavra a palavra,
// rosto cheio ou dividido sem moldura, faixa clara 0/35/50/100, telas, zoom e som em cada movimento.
// Portado do molde que levou o primeiro vídeo à nota 8,7, sem nada específico de marca.
import { FAIXA, ZOOM, RITMO, SFX, SFX_PICO, SOM } from './regras.mjs';
import { gruposDeLegenda, tempoDosGrupos, legendaY, corDaLegenda } from './legenda.mjs';
import { htmlDaTela, htmlDaMidia, itensDaTela } from './telas.mjs';
import { faixaNoInstante, tamanhoPorFaixa, fimDoGancho } from './cenas.mjs';
import { fichaDoEfeito } from './efeitos.mjs';
import { pessoaDaCena } from './recorte.mjs';
import { normalizar, escaparHtml, palavras as separar, arred } from './texto.mjs';

const r3 = (n) => arred(n, 3);

export function posicaoDaCamera(faixa) {
  const h = FAIXA.alturaPx[faixa];
  if (h === 0 || h === 1920) return 0;
  return h >= 900 ? h - 640 : h - 560;
}

export function eventosDeFaixa(cenas, marca, rostoY) {
  const eventos = [];
  let atual = null;
  for (const c of cenas) {
    if (atual === null) {
      eventos.push({ t: 0, faixa: c.faixa, d: 0 });
      atual = c.faixa;
    } else if (c.faixa !== atual) {
      // cena com efeito entra em corte seco: o efeito é dono do #cam e a costura não pode brigar com ele
      eventos.push({ t: r3(c.inicio), faixa: c.faixa, d: c.efeito ? 0 : FAIXA.transicaoS[c.faixa] });
      atual = c.faixa;
    }
  }
  return eventos.map((ev) => {
    const cor = corDaLegenda(ev.faixa, marca);
    return { ...ev, altura: FAIXA.alturaPx[ev.faixa], camY: posicaoDaCamera(ev.faixa), capY: legendaY(ev.faixa, rostoY), capTexto: cor.texto, capSombra: cor.sombra };
  });
}

export function tempoDoGolpe(cena) {
  const e = Array.isArray(cena.enfase) ? cena.enfase[0] : null;
  if (e && typeof e.inicio === 'number' && e.inicio >= cena.inicio - 0.05 && e.inicio <= cena.fim) return e.inicio;
  return cena.inicio;
}

export function eventosDeZoom(cenas, eventosFaixa) {
  const lista = [];
  for (const f of eventosFaixa) {
    if (f.d > 0 && f.faixa !== 0) lista.push({ t: f.t, para: 1.0, dur: f.d, ease: FAIXA.ease, tipo: 'faixa' });
  }
  cenas.forEach((c, i) => {
    const zoom = c.zoom === undefined && i === 0 ? 'abertura' : c.zoom || 'nenhum';
    const golpe = tempoDoGolpe(c);
    if (zoom === 'abertura') {
      lista.push({ t: c.inicio, de: ZOOM.abertura.de, para: ZOOM.abertura.para, dur: ZOOM.abertura.duracao, ease: ZOOM.abertura.ease, tipo: 'abertura' });
    } else if (zoom === 'punch' || (c.virada && zoom === 'nenhum')) {
      lista.push({ t: golpe, para: ZOOM.punch.pico, dur: ZOOM.punch.subida, ease: 'power3.out', tipo: 'punch' });
      lista.push({ t: golpe + ZOOM.punch.subida, para: ZOOM.punch.assenta, dur: ZOOM.punch.volta, ease: ZOOM.punch.ease, tipo: 'assenta' });
    } else if (zoom === 'lento') {
      const faixaJunto = lista.find((ev) => ev.tipo === 'faixa' && Math.abs(ev.t - c.inicio) < 0.01);
      const t = c.inicio + (faixaJunto ? faixaJunto.dur : 0);
      lista.push({ t, para: ZOOM.lentoAte, dur: Math.max(0.3, c.fim - t), ease: 'sine.inOut', tipo: 'lento' });
    }
  });
  lista.sort((a, b) => a.t - b.t);
  return lista.map((ev, i) => {
    const prox = lista[i + 1];
    const dur = prox ? Math.max(0.05, Math.min(ev.dur, prox.t - ev.t)) : ev.dur;
    return { ...ev, t: r3(ev.t), dur: r3(dur) };
  });
}

// Palavras de ênfase: índice global da palavra na transcrição, uma por cena no máximo.
export function indicesDeEnfase(cenas, palavras) {
  const marcados = new Set();
  for (const c of cenas) {
    const e = Array.isArray(c.enfase) ? c.enfase[0] : null;
    if (!e || !e.palavra) continue;
    const alvo = normalizar(e.palavra);
    let melhor = -1;
    let melhorDist = Infinity;
    palavras.forEach((p, i) => {
      if (p.inicio < c.inicio - 0.1 || p.inicio > c.fim + 0.1) return;
      if (normalizar(p.texto) !== alvo) return;
      const dist = typeof e.inicio === 'number' ? Math.abs(p.inicio - e.inicio) : p.inicio - c.inicio;
      if (dist < melhorDist) {
        melhor = i;
        melhorDist = dist;
      }
    });
    if (melhor >= 0) marcados.add(melhor);
  }
  return marcados;
}

export function montarLegendas(palavrasBrutas, cenas) {
  const palavras = palavrasBrutas.filter((p) => p && String(p.texto || '').trim());
  const enfase = indicesDeEnfase(cenas, palavras);
  const comIndice = palavras.map((p, i) => ({ texto: String(p.texto).trim(), inicio: p.inicio, fim: p.fim, enfase: enfase.has(i) }));
  const grupos = gruposDeLegenda(comIndice);
  const tempos = tempoDosGrupos(grupos);
  const html = [];
  const dados = [];
  const arquivo = [];
  grupos.forEach((g, gi) => {
    const spans = g.map((p, k) => `<span class="w${p.enfase ? ' k' : ''}" id="w${gi}_${k}">${escaparHtml(p.texto)}</span>`);
    html.push(`<div class="cap" id="cap${gi}"><span class="capin">${spans.join(' ')}</span></div>`);
    dados.push({
      id: `cap${gi}`,
      inicio: tempos[gi].inicio,
      fim: tempos[gi].fim,
      palavras: g.map((p, k) => ({ id: `w${gi}_${k}`, t: r3(k === 0 ? tempos[gi].inicio : Math.max(tempos[gi].inicio, p.inicio - 0.04)) })),
    });
    arquivo.push({ texto: g.map((p) => p.texto).join(' '), inicio: tempos[gi].inicio, fim: tempos[gi].fim, palavras: g });
  });
  return { html: html.join('\n'), dados, arquivo };
}

export function montarGancho(dados) {
  const tg = dados.titulo_gancho || { texto: '' };
  const primeira = dados.cenas[0] || {};
  const enf = Array.isArray(primeira.enfase) && primeira.enfase[0] ? normalizar(primeira.enfase[0].palavra) : '';
  let usou = false;
  const palavrasTitulo = separar(tg.texto).map((p) => {
    const marcar = !usou && enf && normalizar(p) === enf;
    if (marcar) usou = true;
    return `<span class="gw${marcar ? ' enf-t' : ''}">${escaparHtml(p)}</span>`;
  });
  const sobre = tg.publico ? `<div class="gancho-sobre">${escaparHtml(tg.publico)}</div>` : '';
  return { html: `${sobre}<div class="gancho-titulo">${palavrasTitulo.join(' ')}</div>`, fim: r3(fimDoGancho(dados.cenas)) };
}

const SOM_DE_ENTRADA = {
  card: [['swish', 0.55]],
  frase: [['swish', 0.55]],
  numero: [['impacto-medio', 0.8], ['swish', 0.4]],
  lista: [['swish', 0.5]],
  passos: [['zip', 0.55]],
  conversa: [['whoosh-rapido', 0.55]],
  prompt: [['swish', 0.45], ['teclado', 0.45]],
  notificacao: [['vibrar', 0.7], ['notificacao-sucesso', 0.85]],
  cta: [['impacto-medio', 0.8], ['brilho', 0.55]],
  checklist: [['swish', 0.5]],
  livre: [['swish', 0.55]],
  midia: [['whoosh-medio', 0.6]],
};

// Lane do Studio para os vídeos de mídia (não muda o tempo; só organiza a linha do tempo).
const TRILHA_MIDIA = 100;
// O vídeo de mídia continua tocando durante a saída da tela (0,35 s).
const MIDIA_SOBRA_S = 0.4;

// livres: { id: HTML da tela livre }. midias: { id: { src, tipo: 'video' | 'imagem' } }.
export function montarTelas(dados, marca, { livres = {}, midias = {}, duracao = Infinity } = {}) {
  const htmls = [];
  const htmlsMidia = [];
  const info = [];
  (dados.telas || []).forEach((tela, k) => {
    const faixa = faixaNoInstante(dados.cenas, tela.entra + 0.2);
    const tamanho = tamanhoPorFaixa(faixa);
    const entrada = Math.max(0, tela.entra - RITMO.antecipacaoCardS);
    if (tela.tipo === 'midia') {
      const m = midias[tela.id] || { src: '', tipo: 'imagem' };
      const video = m.tipo === 'video' ? { inicio: r3(entrada), duracao: r3(Math.min(tela.sai - entrada + MIDIA_SOBRA_S, duracao - entrada)), trilha: TRILHA_MIDIA + k } : null;
      htmlsMidia.push(htmlDaMidia(tela, { alturaPx: faixa === 0 ? 1920 : FAIXA.alturaPx[faixa], src: m.src, video }));
    } else {
      htmls.push(htmlDaTela(tela, { tamanho, solta: faixa === 0, marca, fragmento: livres[tela.id] || '' }));
    }
    const n = itensDaTela(tela);
    const folga = Math.max(0.3, tela.sai - entrada - 0.9);
    const passo = n ? Math.min(tela.tipo === 'conversa' ? 0.6 : 0.4, folga / n) : 0;
    const itens = [];
    for (let k = 0; k < n; k += 1) itens.push({ sel: `#${tela.id}-i${k}`, t: r3(entrada + 0.35 + k * passo), de: tela.tipo === 'conversa' ? tela.campos.mensagens[k].de : '' });
    let barra = null;
    if (tela.tipo === 'passos') {
      const total = (tela.campos.itens || []).length || 1;
      barra = { sel: `#${tela.id}-barra`, de: Math.round((tela.campos.atual / total) * 100), para: Math.round(((tela.campos.atual + 1) / total) * 100), t: r3(entrada + 0.3) };
    }
    const entradaPropria = tela.tipo === 'livre' && (tela.campos || {}).entrada === 'propria';
    info.push({ id: tela.id, sel: `#tela-${tela.id}`, tipo: tela.tipo, entrada: r3(entrada), entra: r3(tela.entra), sai: r3(tela.sai), itens, barra, faixa, entradaPropria });
  });
  return { html: htmls.join('\n'), htmlMidias: htmlsMidia.join('\n'), info };
}

export function montarCta(dados, telasInfo) {
  if (!dados.cta || !dados.cta.palavra || typeof dados.cta.em !== 'number') return { html: '', dados: null };
  const coberto = telasInfo.some((t) => t.tipo === 'cta' && dados.cta.em >= t.entra - 0.5 && dados.cta.em <= t.sai);
  if (coberto) return { html: '', dados: null };
  return {
    html: `<div id="cta-selo"><span>Comente</span><b>${escaparHtml(dados.cta.palavra)}</b></div>`,
    dados: { em: r3(dados.cta.em) },
  };
}

// Lane do Studio para os recortes (vídeo com transparência, um por cena com recorte).
const TRILHA_RECORTE = 200;

// Valor de um campo "arquivo" dentro da composição: midia/x.png vira assets/midia/x.png.
function resolverCampos(efeito, ficha) {
  const p = {};
  for (const [nome, campo] of Object.entries(ficha.campos || {})) {
    if (efeito[nome] === undefined) continue;
    p[nome] = campo.tipo === 'arquivo' ? `assets/${efeito[nome]}` : efeito[nome];
  }
  return p;
}

// Efeitos de cena: três camadas vazias por efeito (fundo atrás do rosto inteiro, atrás da pessoa
// e na frente do rosto) e o vídeo do recorte. recortes: { idDaCena: true } das cenas com recorte pronto.
export function montarEfeitos(dados, { recortes = {}, marca = null, medidas = [] } = {}) {
  const fundo = [];
  const atras = [];
  const frente = [];
  const videos = [];
  const info = [];
  dados.cenas.forEach((c) => {
    if (!c.efeito) return;
    const ficha = fichaDoEfeito(c.efeito.nome);
    if (!ficha) return;
    const id = escaparHtml(c.id);
    const classe = `ef-camada ef-${escaparHtml(ficha.nome)}`;
    fundo.push(`<div id="ef-${id}-fundo" class="${classe} ef-fundo" data-layout-ignore></div>`);
    atras.push(`<div id="ef-${id}-atras" class="${classe} ef-atras" data-layout-ignore></div>`);
    frente.push(`<div id="ef-${id}-frente" class="${classe} ef-frente" data-layout-ignore></div>`);
    const temRecorte = ficha.recorte && recortes[c.id];
    if (temRecorte) {
      const inicio = r3(Math.round(c.inicio * 30) / 30);
      const dur = r3(Math.round(c.fim * 30) / 30 - inicio);
      videos.push(`<video id="rec-${id}" class="clip recorte" src="assets/recorte/${id}.webm" data-start="${inicio}" data-duration="${dur}" data-track-index="${TRILHA_RECORTE + info.length}" muted playsinline></video>`);
    }
    info.push({
      id: c.id,
      nome: ficha.nome,
      inicio: r3(c.inicio),
      fim: r3(c.fim),
      golpe: r3(tempoDoGolpe(c)),
      recorte: temRecorte ? `#rec-${c.id}` : null,
      foto: temRecorte ? `assets/recorte/${c.id}.png` : null,
      fundoSemPessoa: temRecorte ? `assets/recorte/${c.id}-fundo.png` : null,
      pessoa: temRecorte ? recortes[c.id].pessoa : pessoaDaCena(c.id, c.inicio, medidas),
      p: resolverCampos(c.efeito, ficha),
      marca: marca ? { nome: marca.nome || '', arroba: marca.arroba || '' } : { nome: '', arroba: '' },
    });
  });
  return { info, htmlFundo: fundo.join('\n'), htmlAtras: atras.join('\n'), htmlFrente: frente.join('\n'), htmlRecortes: videos.join('\n') };
}

// Série numerada: cabeçalho com o título, o número e o nome do item, e a barra em segmentos.
export function montarSerie(dados, duracao) {
  const s = dados.serie;
  if (!s || !Array.isArray(s.itens) || !s.itens.length) return { html: '', dados: null };
  const total = s.itens.length;
  const doisDigitos = (n) => (n < 10 ? `0${n}` : String(n));
  const numeros = s.itens.map((_, k) => `<b class="serie-num" id="serie-n${k}">${doisDigitos(k + 1)}</b>`).join('');
  const nomes = s.itens.map((it, k) => `<span class="serie-nome" id="serie-i${k}">${escaparHtml(it.nome)}</span>`).join('');
  const segmentos = s.itens.map((_, k) => `<i class="serie-seg" id="serie-s${k}"></i>`).join('');
  const titulo = s.titulo ? `<div class="serie-titulo">${escaparHtml(s.titulo)}</div>` : '';
  const fimCta = dados.cta && typeof dados.cta.em === 'number' ? dados.cta.em : duracao;
  return {
    html: `<div id="serie" data-layout-ignore>${titulo}<div class="serie-linha"><span class="serie-caixa">${numeros}</span><span class="serie-nomes">${nomes}</span></div><div class="serie-barra">${segmentos}</div></div>`,
    dados: { total, itens: s.itens.map((it, k) => ({ k, em: r3(it.em) })), fim: r3(Math.min(duracao, fimCta)) },
  };
}

// Folga depois do "entra" em que um som da cena ainda é o som da chegada da tela: 1 quadro.
const CHEGADA_FOLGA_S = 1 / 30 + 0.001;

// A tela aparece antes do "entra" (antecipação do cartão). Um som que a cena pôs no "entra" da
// tela (ou entre o quadro em que ela aparece e o "entra") é o som da chegada: vai para o quadro em
// que ela aparece. Sem isso, ele tocava 4 quadros atrasado (Issue #13). Som mais longe do "entra"
// (virada, clique, item) fica onde a cena pôs. Com duas telas perto, vale a de "entra" mais perto.
export function alinharNaChegada(em, telasInfo) {
  let melhor = null;
  for (const t of telasInfo || []) {
    if (em < t.entrada - 0.01 || em > t.entra + CHEGADA_FOLGA_S) continue;
    if (!melhor || Math.abs(em - t.entra) < Math.abs(em - melhor.entra)) melhor = t;
  }
  return melhor ? melhor.entrada : em;
}

// "golpe" é o quadro em que o som precisa bater; o começo do arquivo vem antes nos sons de passagem.
export function inicioDoSom(efeito, golpe) {
  return Math.max(0, golpe - (SFX_PICO[efeito] || 0));
}

export function planejarSons({ dados, eventosFaixa, telasInfo, zoomEv, cta, duracao, efeitosInfo = [], serie = null }) {
  const explicitos = [];
  for (const c of dados.cenas) {
    // O som do golpe da fala (virada, zoom punch) fica preso ao golpe, mesmo colado numa chegada de tela.
    const golpeDaFala = c.virada || c.zoom === 'punch' ? tempoDoGolpe(c) : null;
    for (const s of c.sons || []) {
      const noGolpe = golpeDaFala !== null && Math.abs(s.em - golpeDaFala) <= CHEGADA_FOLGA_S;
      explicitos.push({ efeito: s.efeito, golpe: noGolpe ? s.em : alinharNaChegada(s.em, telasInfo), volume: s.volume ?? 0.8, motivo: `cena ${c.id}` });
    }
  }
  const auto = [];
  const add = (efeito, golpe, volume, motivo) => auto.push({ efeito, golpe: Math.max(0, golpe), volume, motivo });
  const abertura = zoomEv.find((z) => z.tipo === 'abertura' && z.t < 0.05);
  if (abertura) {
    add('impacto-forte', 0, 1.0, 'abertura');
    add('impacto-medio', 0, 1.0, 'abertura');
    add('whoosh-rapido', 0.21, 0.6, 'abertura');
  }
  for (const c of dados.cenas) {
    const golpe = tempoDoGolpe(c);
    if (c.virada) {
      add('impacto-forte', golpe, SOM.golpeVolume, `virada ${c.id}`);
      add('impacto-medio', golpe, SOM.golpeVolume, `virada ${c.id}`);
    } else if (c.zoom === 'punch') {
      add('impacto-medio', golpe, 0.8, `zoom ${c.id}`);
    }
  }
  // A costura da faixa anda durante f.d: o pico do whoosh cai no meio do movimento.
  for (const f of eventosFaixa) if (f.d > 0) add('whoosh-medio', f.t + f.d / 2, 0.7, 'faixa');
  for (const t of telasInfo) {
    (SOM_DE_ENTRADA[t.tipo] || [['pop', 0.7]]).forEach(([efeito, vol], k) => add(efeito, t.entrada + k * 0.05, vol, `tela ${t.id}`));
    for (const it of t.itens) {
      if (t.tipo === 'conversa') add(it.de === 'eu' ? 'notificacao-saida' : 'pop', it.t, it.de === 'eu' ? 0.8 : 0.7, `tela ${t.id}`);
      else add('pop', it.t, 0.7, `tela ${t.id}`);
    }
    // A saída acelera (power2.in, 0,35 s): o movimento maior vem perto do fim.
    if (t.sai < duracao - 0.3) add('whoosh-rapido', t.sai + 0.2, 0.5, `tela ${t.id} sai`);
  }
  for (const e of efeitosInfo) {
    const ficha = fichaDoEfeito(e.nome);
    for (const som of (ficha && ficha.sons) || []) {
      // "golpe": a palavra de ênfase; "fim": o fim da cena menos o recuo (efeito de saída); número: depois do início
      const golpe = som.em === 'golpe' ? e.golpe + (som.apos || 0) : som.em === 'fim' ? e.fim - (som.recuo || 0) : e.inicio + som.em;
      // "repetir": um som por item de um campo de lista do efeito (ex.: um pop por selo)
      const lista = som.repetir && Array.isArray(e.p[som.repetir.campo]) ? e.p[som.repetir.campo] : [null];
      lista.forEach((_, k) => {
        const t = golpe + k * (som.repetir ? som.repetir.passo : 0);
        if (t <= e.fim + 0.3) add(som.efeito, t, som.volume ?? 0.7, `efeito ${e.nome} ${e.id}`);
      });
    }
  }
  if (serie) for (const it of serie.itens) add('swish', it.em, 0.5, `série ${it.k + 1}`);
  if (cta) {
    add('brilho', cta.em, 0.55, 'pedido');
    add('pop', cta.em + 0.1, 0.85, 'pedido');
  }
  const perto = (lista, s, janela) => lista.some((x) => Math.abs(x.golpe - s.golpe) < janela && (janela > 0.1 || x.efeito === s.efeito));
  const finais = [...explicitos];
  for (const s of auto) {
    if (perto(explicitos, s, 0.15)) continue;
    if (perto(finais, s, 0.08)) continue;
    finais.push(s);
  }
  return finais
    .map((s) => {
      const inicio = inicioDoSom(s.efeito, s.golpe);
      // Perto do zero o começo não recua o bastante: o pico cai depois, e o golpe registrado é o real.
      return { ...s, inicio, golpe: Math.max(s.golpe, inicio + (SFX_PICO[s.efeito] || 0)) };
    })
    .filter((s) => SFX[s.efeito] !== undefined && s.inicio < duracao - 0.02)
    .sort((a, b) => a.inicio - b.inicio)
    .map((s) => ({
      efeito: s.efeito,
      arquivo: `assets/sfx/${s.efeito}.wav`,
      inicio: r3(s.inicio),
      golpe: r3(s.golpe),
      volume: Math.min(SOM.volumeMaxHyperframes, Math.max(0, Number(s.volume))),
      duracao: r3(Math.min(SFX[s.efeito], duracao - s.inicio)),
      motivo: s.motivo,
    }));
}

export function htmlDosSons(sons) {
  return sons
    .map((s, n) => `<audio id="s${n}" class="clip" src="${s.arquivo}" data-start="${s.inicio}" data-duration="${s.duracao}" data-volume="${s.volume}" data-track-index="${10 + n}"></audio>`)
    .join('\n');
}

export function jsonParaScript(objeto) {
  return JSON.stringify(objeto).split('</').join('<\\/');
}

// Junta tudo: dados para o animacao.js, pedaços de HTML e os arquivos sons.json e legendas.json.
export function montarComposicao({ dados, transcricao, marca, duracao, livres = {}, midias = {}, recortes = {}, medidas = [], legendaRostoY, zoomOrigem = null }) {
  const eventosFaixa = eventosDeFaixa(dados.cenas, marca, legendaRostoY ?? dados.legenda_rosto_y);
  const zoomEv = eventosDeZoom(dados.cenas, eventosFaixa);
  const legendas = montarLegendas(transcricao.palavras || [], dados.cenas);
  const gancho = montarGancho(dados);
  const telas = montarTelas(dados, marca, { livres, midias, duracao });
  const cta = montarCta(dados, telas.info);
  const efeitos = montarEfeitos(dados, { recortes, marca, medidas });
  const serie = montarSerie(dados, duracao);
  const sons = planejarSons({ dados, eventosFaixa, telasInfo: telas.info, zoomEv, cta: cta.dados, duracao, efeitosInfo: efeitos.info, serie: serie.dados });
  const dadosReel = {
    duracao: r3(duracao),
    faixas: eventosFaixa,
    zoom: zoomEv,
    // Centro do rosto medido no take: o zoom cresce dali. null: centro fixo do molde.
    zoomOrigem,
    legendas: legendas.dados,
    telas: telas.info,
    gancho: { fim: gancho.fim },
    cta: cta.dados,
    efeitos: efeitos.info,
    serie: serie.dados,
    ease: FAIXA.ease,
  };
  return { dadosReel, legendas, gancho, telas, cta, sons, efeitos, serie };
}
