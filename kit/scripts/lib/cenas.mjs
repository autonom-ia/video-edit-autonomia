// Validação da tabela de cenas (cenas.json), com os limites da spec D.4 e D.6.
import { contarPalavras, normalizar, contemTermo } from './texto.mjs';
import { RITMO, LIMITES_TELA, TITULO_GANCHO, FAIXA, ROSTO_NENHUM_MAX_PCT } from './regras.mjs';
import { aviso } from './saida.mjs';
import { lerTelaDeArquivo } from './telas-livres.mjs';

const CHAVES_TOPO = ['versao', 'duracao_alvo_s', 'direcao_de_arte', 'titulo_gancho', 'apps_reais', 'cenas', 'telas', 'cta'];
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
  // Desenhada pelo assistente: HTML, CSS e animação num arquivo do projeto.
  livre: ['arquivo', 'descricao', 'entrada'],
  // Gravação de tela, vídeo de apoio ou imagem, preparada pelo comando "midia".
  midia: ['arquivo', 'descricao', 'encaixe'],
};
// Telas cujo movimento vem do próprio conteúdo (sem limite de palavras por campo).
export const TELAS_DE_ARQUIVO = ['livre', 'midia'];
export const TIPOS_DE_TELA = Object.keys(CAMPOS);
export const EFEITOS = ['impacto-forte', 'impacto-medio', 'whoosh-rapido', 'whoosh-medio', 'swish', 'pop', 'zip', 'teclado', 'brilho', 'notificacao-saida', 'notificacao-sucesso', 'vibrar', 'subida', 'cintilar'];

// O id vira nome de arquivo (telas/<id>.png) e seletor (#tela-<id>).
export function idSeguro(id) {
  if (!id || id.length > 40) return false;
  for (const ch of id) {
    const ok = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '-' || ch === '_';
    if (!ok) return false;
  }
  return true;
}

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
  if (TELAS_DE_ARQUIVO.includes(tela.tipo)) return 0;
  if (tela.tipo === 'numero') return contarPalavras(`${c.numero || ''} ${c.apoio || ''}`);
  return contarPalavras(partes.join(' '));
}

export function validarTela(tela, onde, { pastaProjeto = null } = {}) {
  const problemas = [];
  chavesDesconhecidas(tela, CHAVES_TELA, onde, problemas);
  if (!txt(tela.id) || !tela.id) problemas.push({ onde, problema: 'tela sem "id"' });
  else if (!idSeguro(tela.id)) problemas.push({ onde, problema: `"id" da tela só pode ter letras sem acento, números, "-" e "_" (veio "${tela.id}")` });
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
      if (!Number.isInteger(c.atual) || c.atual < 0 || c.atual >= Math.max(1, itens.length)) {
        problemas.push({ onde, problema: `"atual" conta do 0: o primeiro passo é 0, o segundo é 1, o último é ${Math.max(0, itens.length - 1)} (veio ${JSON.stringify(c.atual)})` });
      }
      break;
    }
    case 'conversa': {
      limite(problemas, onde, 'nome', c.nome, L.nome);
      if (c.status !== undefined) limite(problemas, onde, 'status', c.status, L.status);
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
    case 'livre':
    case 'midia': {
      if (!txt(c.descricao) || !c.descricao.trim()) problemas.push({ onde, problema: '"descricao" diz em uma frase o que a tela mostra (vai para o avaliador)' });
      if (tela.tipo === 'livre' && c.entrada !== undefined && !['padrao', 'propria'].includes(c.entrada)) problemas.push({ onde, problema: '"entrada" é "padrao" (o estúdio faz a chegada e a saída) ou "propria" (a sua animação faz)' });
      if (tela.tipo === 'midia' && c.encaixe !== undefined && !['cobrir', 'conter'].includes(c.encaixe)) problemas.push({ onde, problema: '"encaixe" é "cobrir" (enche o espaço) ou "conter" (mostra tudo)' });
      const lido = lerTelaDeArquivo(tela, pastaProjeto);
      lido.problemas.forEach((problema) => problemas.push({ onde, problema }));
      break;
    }
    default:
      break;
  }
  if (num(tela.entra) && num(tela.sai)) {
    const maximo = TELAS_DE_ARQUIVO.includes(tela.tipo) ? RITMO.telaLivreMaxS : RITMO.telaMaxS;
    if (tela.sai <= tela.entra) problemas.push({ onde, problema: '"sai" precisa ser depois de "entra"' });
    if (tela.sai - tela.entra > maximo + 1e-6) problemas.push({ onde, problema: `tela fica ${(tela.sai - tela.entra).toFixed(2)} s no ar; o máximo é ${maximo} s` });
  } else {
    problemas.push({ onde, problema: 'tela precisa de "entra" e "sai" em segundos' });
  }
  return problemas;
}

// Devolve {problemas: [...], avisos: [...]}. Problemas reprovam (exit 2); avisos só informam.
// Apps que o aluno usa de verdade e cita na fala: nome, de onde veio a referência e por quê.
// O app precisa aparecer na fala pelo nome ou pelo jeito que o aluno chamou ("citado_como").
function validarAppsReais(lista, cenas, problemas) {
  if (lista === undefined) return;
  if (!Array.isArray(lista)) {
    problemas.push({ onde: 'apps_reais', problema: 'precisa ser uma lista' });
    return;
  }
  const falas = normalizar(cenas.map((c) => c.fala || '').join(' '));
  lista.forEach((app, i) => {
    const onde = `apps_reais[${i}]`;
    chavesDesconhecidas(app, ['nome', 'referencia', 'porque', 'citado_como'], onde, problemas);
    for (const campo of ['nome', 'referencia', 'porque']) {
      if (!app || !txt(app[campo]) || !app[campo].trim()) problemas.push({ onde, problema: `falta "${campo}"` });
    }
    if (!app || !txt(app.nome) || !app.nome.trim()) return;
    const comoFalou = txt(app.citado_como) && app.citado_como.trim() ? app.citado_como : '';
    if (!contemTermo(falas, app.nome) && !(comoFalou && contemTermo(falas, comoFalou))) {
      problemas.push({ onde, problema: `"${app.nome}" não aparece na fala. App liberado é o que o aluno usa e cita; se ele chamou de outro jeito, ponha as palavras dele em "citado_como"` });
    }
  });
}

export function validarCenas(dados, { briefing = null, pastaProjeto = null } = {}) {
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
  telas.forEach((t, i) => problemas.push(...validarTela(t, `telas[${i}] (${t.id || 'sem id'})`, { pastaProjeto })));
  validarAppsReais(dados.apps_reais, cenas, problemas);

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
