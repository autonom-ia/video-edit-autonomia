// Validação da tabela de cenas (cenas.json), com os limites da spec D.4 e D.6.
import { contarPalavras } from './texto.mjs';
import { RITMO, LIMITES_TELA, TITULO_GANCHO, FAIXA, ROSTO_NENHUM_MAX_PCT } from './regras.mjs';
import { aviso } from './saida.mjs';

const CHAVES_TOPO = ['versao', 'duracao_alvo_s', 'direcao_de_arte', 'titulo_gancho', 'cenas', 'telas', 'cta'];
const CHAVES_CENA = ['id', 'fala', 'inicio', 'fim', 'rosto', 'faixa', 'zoom', 'tela', 'enfase', 'sons', 'virada', 'reconstrucao'];
const CHAVES_TELA = ['id', 'tipo', 'campos', 'entra', 'sai'];
const CAMPOS = {
  card: ['texto'],
  frase: ['texto', 'apoio'],
  numero: ['numero', 'apoio', 'origem'],
  lista: ['titulo', 'itens'],
  passos: ['itens', 'atual'],
  conversa: ['nome', 'status', 'mensagens'],
  prompt: ['prompt', 'resposta'],
  notificacao: ['app', 'texto'],
  cta: ['palavra', 'frase'],
};
export const TIPOS_DE_TELA = Object.keys(CAMPOS);
export const EFEITOS = ['impacto-forte', 'impacto-medio', 'whoosh-rapido', 'whoosh-medio', 'swish', 'pop', 'zip', 'teclado', 'brilho', 'notificacao-saida', 'notificacao-sucesso', 'vibrar', 'subida', 'cintilar'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const txt = (v) => typeof v === 'string';

function chavesDesconhecidas(obj, permitidas, onde, problemas) {
  for (const chave of Object.keys(obj || {})) {
    if (chave === 'etiqueta') problemas.push({ onde, problema: 'a chave "etiqueta" é proibida (nada de faixa de "simulação")' });
    else if (!permitidas.includes(chave)) problemas.push({ onde, problema: `chave desconhecida: "${chave}"` });
  }
}

function limite(problemas, onde, campo, texto, max) {
  if (!txt(texto)) {
    problemas.push({ onde, problema: `"${campo}" precisa ser texto` });
    return;
  }
  const n = contarPalavras(texto);
  if (n > max) problemas.push({ onde, problema: `"${campo}" tem ${n} palavras; o limite é ${max}`, tipo: 'limite' });
}

export function palavrasDaTela(tela) {
  const c = tela.campos || {};
  const partes = [];
  for (const v of Object.values(c)) {
    if (txt(v)) partes.push(v);
    else if (Array.isArray(v)) for (const item of v) partes.push(txt(item) ? item : (item && item.texto) || '');
  }
  if (tela.tipo === 'numero') return contarPalavras(`${c.numero || ''} ${c.apoio || ''}`);
  return contarPalavras(partes.join(' '));
}

export function validarTela(tela, onde) {
  const problemas = [];
  chavesDesconhecidas(tela, CHAVES_TELA, onde, problemas);
  if (!txt(tela.id) || !tela.id) problemas.push({ onde, problema: 'tela sem "id"' });
  if (!TIPOS_DE_TELA.includes(tela.tipo)) {
    problemas.push({ onde, problema: `tipo de tela desconhecido: "${tela.tipo}"` });
    return problemas;
  }
  const c = tela.campos || {};
  if (typeof c !== 'object' || Array.isArray(c)) {
    problemas.push({ onde, problema: '"campos" precisa ser um objeto' });
    return problemas;
  }
  chavesDesconhecidas(c, CAMPOS[tela.tipo], `${onde}.campos`, problemas);
  const L = LIMITES_TELA[tela.tipo];
  switch (tela.tipo) {
    case 'card':
      limite(problemas, onde, 'texto', c.texto, L.texto);
      break;
    case 'frase':
      limite(problemas, onde, 'texto', c.texto, L.texto);
      if (c.apoio !== undefined) limite(problemas, onde, 'apoio', c.apoio, L.apoio);
      break;
    case 'numero':
      limite(problemas, onde, 'numero', String(c.numero ?? ''), L.numero);
      limite(problemas, onde, 'apoio', c.apoio ?? '', L.apoio);
      if (!txt(c.origem) || !c.origem.trim()) problemas.push({ onde, problema: 'número sem "origem" (de onde vem o número)', tipo: 'origem' });
      break;
    case 'lista': {
      if (c.titulo !== undefined) limite(problemas, onde, 'titulo', c.titulo, L.titulo);
      const itens = Array.isArray(c.itens) ? c.itens : [];
      if (itens.length < L.itensMin || itens.length > L.itensMax) problemas.push({ onde, problema: `lista precisa de ${L.itensMin} a ${L.itensMax} itens`, tipo: 'limite' });
      itens.forEach((it, i) => limite(problemas, onde, `itens[${i}]`, it, L.item));
      break;
    }
    case 'passos': {
      const itens = Array.isArray(c.itens) ? c.itens : [];
      if (itens.length < L.itensMin || itens.length > L.itensMax) problemas.push({ onde, problema: `passos precisa de ${L.itensMin} a ${L.itensMax} itens`, tipo: 'limite' });
      itens.forEach((it, i) => limite(problemas, onde, `itens[${i}]`, it, L.item));
      if (!Number.isInteger(c.atual) || c.atual < 0 || c.atual >= Math.max(1, itens.length)) problemas.push({ onde, problema: '"atual" precisa ser o número de um dos passos (começando em 0)' });
      break;
    }
    case 'conversa': {
      limite(problemas, onde, 'nome', c.nome, L.nome);
      if (c.status !== 'online') problemas.push({ onde, problema: '"status" precisa ser "online"' });
      const msgs = Array.isArray(c.mensagens) ? c.mensagens : [];
      if (msgs.length < L.mensagensMin || msgs.length > L.mensagensMax) problemas.push({ onde, problema: `conversa precisa de ${L.mensagensMin} a ${L.mensagensMax} mensagens`, tipo: 'limite' });
      msgs.forEach((m, i) => {
        if (!m || (m.de !== 'outro' && m.de !== 'eu')) problemas.push({ onde, problema: `mensagens[${i}].de precisa ser "outro" ou "eu"` });
        limite(problemas, onde, `mensagens[${i}].texto`, m && m.texto, L.mensagem);
        chavesDesconhecidas(m, ['de', 'texto'], `${onde}.mensagens[${i}]`, problemas);
      });
      break;
    }
    case 'prompt':
      limite(problemas, onde, 'prompt', c.prompt, L.prompt);
      limite(problemas, onde, 'resposta', c.resposta, L.resposta);
      break;
    case 'notificacao':
      if (!L.apps.includes(c.app)) problemas.push({ onde, problema: `"app" precisa ser um destes: ${L.apps.join(', ')}` });
      limite(problemas, onde, 'texto', c.texto, L.texto);
      break;
    case 'cta':
      if (!txt(c.palavra) || !c.palavra.trim() || contarPalavras(c.palavra) !== 1) problemas.push({ onde, problema: '"palavra" do pedido precisa ser uma palavra só' });
      limite(problemas, onde, 'frase', c.frase ?? '', L.frase);
      break;
    default:
      break;
  }
  if (num(tela.entra) && num(tela.sai)) {
    if (tela.sai <= tela.entra) problemas.push({ onde, problema: '"sai" precisa ser depois de "entra"' });
    if (tela.sai - tela.entra > RITMO.telaMaxS + 1e-6) problemas.push({ onde, problema: `tela fica ${(tela.sai - tela.entra).toFixed(2)} s no ar; o máximo é ${RITMO.telaMaxS} s` });
  } else {
    problemas.push({ onde, problema: 'tela precisa de "entra" e "sai" em segundos' });
  }
  return problemas;
}

// Devolve {problemas: [...], avisos: [...]}. Problemas reprovam (exit 2); avisos só informam.
export function validarCenas(dados, { briefing = null } = {}) {
  const problemas = [];
  const avisos = [];
  if (!dados || typeof dados !== 'object') return { problemas: [{ onde: 'cenas.json', problema: 'arquivo vazio ou inválido' }], avisos };
  chavesDesconhecidas(dados, CHAVES_TOPO, 'cenas.json', problemas);
  const tg = dados.titulo_gancho;
  if (!tg || !txt(tg.texto) || !tg.texto.trim()) problemas.push({ onde: 'titulo_gancho', problema: 'falta o título do gancho (texto escrito no quadro 0)' });
  else {
    limite(problemas, 'titulo_gancho', 'texto', tg.texto, TITULO_GANCHO.texto);
    if (tg.publico !== undefined && tg.publico !== '') limite(problemas, 'titulo_gancho', 'publico', tg.publico, TITULO_GANCHO.publico);
    chavesDesconhecidas(tg, ['texto', 'publico'], 'titulo_gancho', problemas);
  }
  const cenas = Array.isArray(dados.cenas) ? dados.cenas : [];
  const telas = Array.isArray(dados.telas) ? dados.telas : [];
  if (!cenas.length) problemas.push({ onde: 'cenas', problema: 'não há nenhuma cena' });
  const idsTela = new Set(telas.map((t) => t.id));
  telas.forEach((t, i) => problemas.push(...validarTela(t, `telas[${i}] (${t.id || 'sem id'})`)));

  let anterior = null;
  let semRosto = 0;
  let total = 0;
  let cheiaInicio = null;
  cenas.forEach((c, i) => {
    const onde = `cenas[${i}] (${c.id || 'sem id'})`;
    chavesDesconhecidas(c, CHAVES_CENA, onde, problemas);
    if (!num(c.inicio) || !num(c.fim)) {
      problemas.push({ onde, problema: 'cena precisa de "inicio" e "fim" em segundos' });
      return;
    }
    if (i === 0 && Math.abs(c.inicio) > 0.001) problemas.push({ onde, problema: 'a primeira cena precisa começar em 0' });
    if (c.fim <= c.inicio) problemas.push({ onde, problema: '"fim" precisa ser depois de "inicio"' });
    if (anterior) {
      const buraco = c.inicio - anterior.fim;
      if (buraco > 0.05) problemas.push({ onde, problema: `buraco de ${buraco.toFixed(2)} s depois da cena anterior` });
      if (c.inicio < anterior.inicio || buraco < -0.05) problemas.push({ onde, problema: 'tempos fora de ordem' });
    }
    if (!FAIXA.valores.includes(c.faixa)) problemas.push({ onde, problema: '"faixa" precisa ser 0, 35, 50 ou 100' });
    if (c.rosto !== undefined && !['cheio', 'dividido', 'nenhum'].includes(c.rosto)) problemas.push({ onde, problema: '"rosto" precisa ser cheio, dividido ou nenhum' });
    if (c.zoom !== undefined && !['abertura', 'punch', 'lento', 'nenhum'].includes(c.zoom)) problemas.push({ onde, problema: '"zoom" precisa ser abertura, punch, lento ou nenhum' });
    if (!txt(c.fala)) problemas.push({ onde, problema: 'falta a "fala" da cena' });
    const enf = Array.isArray(c.enfase) ? c.enfase : [];
    if (enf.length > 1) problemas.push({ onde, problema: 'mais de 1 ênfase na cena (o máximo é 1)' });
    enf.forEach((e, k) => chavesDesconhecidas(e, ['palavra', 'inicio'], `${onde}.enfase[${k}]`, problemas));
    (Array.isArray(c.sons) ? c.sons : []).forEach((s, k) => {
      chavesDesconhecidas(s, ['efeito', 'em', 'volume'], `${onde}.sons[${k}]`, problemas);
      if (!EFEITOS.includes(s.efeito)) problemas.push({ onde, problema: `efeito de som desconhecido: "${s.efeito}"` });
      if (!num(s.em)) problemas.push({ onde, problema: `sons[${k}] precisa de "em" em segundos` });
    });
    if (c.tela !== null && c.tela !== undefined && !idsTela.has(c.tela)) problemas.push({ onde, problema: `a tela "${c.tela}" não existe na lista de telas` });
    if (c.faixa === 100) {
      if (!c.tela) problemas.push({ onde, problema: 'faixa 100 só pode aparecer com uma tela' });
      if (cheiaInicio === null) cheiaInicio = c.inicio;
      if (c.fim - cheiaInicio > RITMO.faixaCheiaMaxS + 1e-6) problemas.push({ onde, problema: `faixa 100 seguida por ${(c.fim - cheiaInicio).toFixed(2)} s; o máximo é ${RITMO.faixaCheiaMaxS} s` });
    } else {
      cheiaInicio = null;
    }
    const dur = c.fim - c.inicio;
    total += dur;
    const rosto = c.rosto || (c.faixa === 100 ? 'nenhum' : c.faixa === 0 ? 'cheio' : 'dividido');
    if (rosto === 'nenhum') semRosto += dur;
    const mudouFaixa = anterior && anterior.faixa !== c.faixa;
    const temMovimento = c.tela || enf.length || (Array.isArray(c.sons) && c.sons.length) || (c.zoom && c.zoom !== 'nenhum') || mudouFaixa;
    if (dur > RITMO.paradoMaxS && !temMovimento) avisos.push(aviso('TRECHO_PARADO', { cena: c.id, segundos: Math.round(dur * 10) / 10 }));
    anterior = c;
  });
  if (dados.cta) {
    chavesDesconhecidas(dados.cta, ['palavra', 'em'], 'cta', problemas);
    if (!txt(dados.cta.palavra) || dados.cta.palavra.includes(' ') || !dados.cta.palavra.trim()) problemas.push({ onde: 'cta', problema: 'a palavra do pedido precisa ser uma palavra só, sem espaço' });
  }
  for (const t of telas) {
    if (!num(t.entra) || !num(t.sai)) continue;
    const minimo = Math.max(RITMO.textoMinimoS, palavrasDaTela(t) * RITMO.textoSegundosPorPalavra);
    if (t.sai - t.entra < minimo - 0.05) avisos.push(aviso('TELA_RAPIDA', { tela: t.id, segundos: Math.round((t.sai - t.entra) * 10) / 10, minimo: Math.round(minimo * 10) / 10 }));
  }
  if (briefing && briefing.rosto === 'sim' && total > 0 && (semRosto / total) * 100 > ROSTO_NENHUM_MAX_PCT) {
    avisos.push(aviso('ROSTO_POUCO', { porcentagem: Math.round((semRosto / total) * 100) }));
  }
  return { problemas, avisos };
}

export function faixaNoInstante(cenas, t) {
  for (const c of cenas) if (t >= c.inicio - 1e-6 && t < c.fim) return c.faixa;
  return cenas.length ? cenas[cenas.length - 1].faixa : 0;
}

export function tamanhoPorFaixa(faixa) {
  if (faixa === 100) return 'g';
  if (faixa === 50) return 'm';
  return 'p';
}
