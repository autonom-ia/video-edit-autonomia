// Efeitos de cena: catálogo (kit/efeitos/<nome>.json) e validação do campo "efeito" de uma cena.
// Cada efeito tem três arquivos: <nome>.json (o que é, quando usar, campos, sons), <nome>.js
// (monta e anima no navegador) e, se precisar, <nome>.css.
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';
import { contarPalavras } from './texto.mjs';
import { EFEITOS_DE_CENA, MIDIA } from './regras.mjs';

export const PASTA_EFEITOS = path.join(KIT, 'efeitos');
const TIPOS_DE_CAMPO = ['texto', 'lista', 'numero', 'escolha', 'arquivo'];
// Chaves que todo efeito aceita, além dos campos dele.
const CHAVES_FIXAS = ['nome', 'porque'];

const txt = (v) => typeof v === 'string';
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Confere a ficha de um efeito. Ficha errada é erro do kit, não do aluno: o teste do kit pega.
export function problemasDaFicha(ficha, arquivo) {
  const p = [];
  if (!ficha || typeof ficha !== 'object') return [`${arquivo}: ficha inválida`];
  if (!txt(ficha.nome) || `${ficha.nome}.json` !== arquivo) p.push(`${arquivo}: "nome" precisa ser igual ao nome do arquivo`);
  for (const campo of ['titulo', 'funcao', 'referencia']) if (!txt(ficha[campo]) || !ficha[campo].trim()) p.push(`${arquivo}: falta "${campo}"`);
  if (typeof ficha.recorte !== 'boolean') p.push(`${arquivo}: "recorte" precisa ser true ou false`);
  if (typeof ficha.rosto_pequeno !== 'boolean') p.push(`${arquivo}: "rosto_pequeno" precisa ser true ou false`);
  const d = ficha.duracao || {};
  if (!num(d.min) || !num(d.max) || d.min <= 0 || d.max < d.min) p.push(`${arquivo}: "duracao" precisa de "min" e "max" em segundos`);
  for (const [nome, campo] of Object.entries(ficha.campos || {})) {
    if (CHAVES_FIXAS.includes(nome)) p.push(`${arquivo}: o campo "${nome}" é reservado`);
    if (!campo || !TIPOS_DE_CAMPO.includes(campo.tipo)) p.push(`${arquivo}: campo "${nome}" com tipo desconhecido`);
  }
  for (const s of ficha.sons || []) {
    if (!txt(s.efeito)) p.push(`${arquivo}: som sem "efeito"`);
    if (s.em !== 'golpe' && !num(s.em)) p.push(`${arquivo}: som "${s.efeito}" precisa de "em" (segundos depois do início ou "golpe")`);
  }
  return p;
}

let cache = null;
// { nome: ficha }. Lido uma vez por processo.
export function catalogo() {
  if (cache) return cache;
  const lista = {};
  if (fs.existsSync(PASTA_EFEITOS)) {
    for (const arquivo of fs.readdirSync(PASTA_EFEITOS).filter((n) => n.endsWith('.json')).sort()) {
      const ficha = JSON.parse(fs.readFileSync(path.join(PASTA_EFEITOS, arquivo), 'utf8'));
      lista[ficha.nome] = ficha;
    }
  }
  cache = lista;
  return cache;
}

export function fichaDoEfeito(nome) {
  return catalogo()[nome] || null;
}

// Arquivos que o montar copia para a composição.
export function arquivosDoEfeito(nome) {
  const js = path.join(PASTA_EFEITOS, `${nome}.js`);
  const css = path.join(PASTA_EFEITOS, `${nome}.css`);
  return { js: fs.existsSync(js) ? js : null, css: fs.existsSync(css) ? css : null };
}

function validarCampo(nome, campo, valor, onde, problemas, pastaProjeto) {
  const ausente = valor === undefined || valor === null || valor === '';
  if (ausente) {
    if (campo.obrigatorio) problemas.push({ onde, problema: `o efeito precisa do campo "${nome}"` });
    return;
  }
  switch (campo.tipo) {
    case 'texto':
      if (!txt(valor)) problemas.push({ onde, problema: `"${nome}" precisa ser texto` });
      else if (campo.palavras && contarPalavras(valor) > campo.palavras) problemas.push({ onde, problema: `"${nome}" tem ${contarPalavras(valor)} palavras; o limite é ${campo.palavras}`, tipo: 'limite' });
      break;
    case 'lista': {
      const [min, max] = campo.itens || [1, 6];
      if (!Array.isArray(valor)) {
        problemas.push({ onde, problema: `"${nome}" precisa ser uma lista` });
        break;
      }
      if (valor.length < min || valor.length > max) problemas.push({ onde, problema: `"${nome}" precisa de ${min} a ${max} itens`, tipo: 'limite' });
      valor.forEach((item, k) => {
        if (campo.opcoes) {
          if (!campo.opcoes.includes(item)) problemas.push({ onde, problema: `${nome}[${k}] precisa ser um destes: ${campo.opcoes.join(', ')}` });
        } else if (!txt(item)) problemas.push({ onde, problema: `${nome}[${k}] precisa ser texto` });
        else if (campo.palavras && contarPalavras(item) > campo.palavras) problemas.push({ onde, problema: `${nome}[${k}] tem ${contarPalavras(item)} palavras; o limite é ${campo.palavras}`, tipo: 'limite' });
      });
      break;
    }
    case 'numero':
      if (!num(valor)) problemas.push({ onde, problema: `"${nome}" precisa ser um número` });
      else if ((num(campo.min) && valor < campo.min) || (num(campo.max) && valor > campo.max)) problemas.push({ onde, problema: `"${nome}" vai de ${campo.min} a ${campo.max}` });
      break;
    case 'escolha':
      if (!campo.opcoes.includes(valor)) problemas.push({ onde, problema: `"${nome}" precisa ser um destes: ${campo.opcoes.join(', ')}` });
      break;
    case 'arquivo': {
      if (!txt(valor)) {
        problemas.push({ onde, problema: `"${nome}" é o caminho de um arquivo em ${MIDIA.pasta}/` });
        break;
      }
      const partes = valor.split('/');
      if (partes[0] !== MIDIA.pasta || partes.includes('..') || partes.length < 2) {
        problemas.push({ onde, problema: `"${nome}" precisa estar dentro de ${MIDIA.pasta}/ do projeto (veio "${valor}")` });
        break;
      }
      const ext = path.extname(valor).toLowerCase();
      if (!MIDIA.imagem.includes(ext)) problemas.push({ onde, problema: `"${nome}" precisa ser uma imagem (${MIDIA.imagem.join(', ')})` });
      if (pastaProjeto && !fs.existsSync(path.join(pastaProjeto, ...partes))) problemas.push({ onde, problema: `o arquivo "${valor}" não existe no projeto` });
      break;
    }
    default:
      break;
  }
}

// Valida o "efeito" de uma cena. Devolve a lista de problemas (reprovam).
export function validarEfeito(efeito, cena, onde, { pastaProjeto = null } = {}) {
  const problemas = [];
  if (!efeito || typeof efeito !== 'object' || Array.isArray(efeito)) return [{ onde, problema: '"efeito" precisa ser um objeto {"nome", "porque", ...}' }];
  const ficha = fichaDoEfeito(efeito.nome);
  if (!ficha) {
    const nomes = Object.keys(catalogo()).join(', ');
    return [{ onde, problema: `efeito desconhecido: "${efeito.nome}". Os efeitos do kit: ${nomes}` }];
  }
  if (!txt(efeito.porque) || contarPalavras(efeito.porque) < EFEITOS_DE_CENA.porqueMinPalavras) {
    problemas.push({ onde, problema: `"porque" diz, em uma frase de ${EFEITOS_DE_CENA.porqueMinPalavras} palavras ou mais, que trecho da fala o efeito ajuda a entender` });
  }
  const campos = ficha.campos || {};
  for (const chave of Object.keys(efeito)) {
    if (!CHAVES_FIXAS.includes(chave) && !campos[chave]) problemas.push({ onde, problema: `o efeito "${ficha.nome}" não tem o campo "${chave}"` });
  }
  for (const [nome, campo] of Object.entries(campos)) validarCampo(nome, campo, efeito[nome], onde, problemas, pastaProjeto);
  if (num(cena.inicio) && num(cena.fim)) {
    const dur = cena.fim - cena.inicio;
    if (dur < ficha.duracao.min - 1e-6 || dur > ficha.duracao.max + 1e-6) {
      problemas.push({ onde, problema: `o efeito "${ficha.nome}" pede uma cena de ${ficha.duracao.min} a ${ficha.duracao.max} s; esta tem ${dur.toFixed(2)} s` });
    }
  }
  if (cena.faixa !== 0 || (cena.rosto && cena.rosto !== 'cheio')) {
    problemas.push({ onde, problema: 'efeito de cena só com o rosto cheio (faixa 0)' });
  }
  return problemas;
}

// Cenas que precisam do recorte da pessoa, em ordem.
export function cenasComRecorte(cenas) {
  return (cenas || []).filter((c) => c.efeito && fichaDoEfeito(c.efeito.nome) && fichaDoEfeito(c.efeito.nome).recorte);
}
