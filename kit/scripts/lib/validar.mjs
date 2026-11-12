// Validador mínimo de JSON Schema, sem dependência.
// Cobre: type, required, properties, additionalProperties, items, enum, const,
// minItems, maxItems, minLength, maxLength, minimum, maximum, $ref (#/$defs/...),
// e o formato próprio "cor-hex" (#RRGGBB) ou "cor-hex-ou-vazio".
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';

const HEX = '0123456789abcdefABCDEF';

export function ehCorHex(valor) {
  if (typeof valor !== 'string' || valor.length !== 7 || valor[0] !== '#') return false;
  for (const ch of valor.slice(1)) if (!HEX.includes(ch)) return false;
  return true;
}

function tipoDe(valor) {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'array';
  if (typeof valor === 'number') return Number.isInteger(valor) ? 'integer' : 'number';
  return typeof valor;
}

function confereTipo(esperado, valor) {
  const real = tipoDe(valor);
  const lista = Array.isArray(esperado) ? esperado : [esperado];
  return lista.some((t) => t === real || (t === 'number' && real === 'integer'));
}

function resolver(raiz, ref) {
  if (!ref.startsWith('#/')) return {};
  let atual = raiz;
  for (const parte of ref.slice(2).split('/')) atual = atual ? atual[parte] : undefined;
  return atual || {};
}

function comprimento(texto) {
  return [...texto].length;
}

export function validar(esquema, valor, raiz = esquema, caminho = '$') {
  const erros = [];
  const add = (problema) => erros.push({ caminho, problema });
  if (esquema.$ref) return validar(resolver(raiz, esquema.$ref), valor, raiz, caminho);
  if (esquema.type && !confereTipo(esquema.type, valor)) {
    add(`tipo errado: esperado ${[].concat(esquema.type).join(' ou ')}, veio ${tipoDe(valor)}`);
    return erros;
  }
  if (esquema.const !== undefined && valor !== esquema.const) add(`deveria ser ${JSON.stringify(esquema.const)}`);
  if (esquema.enum && !esquema.enum.some((e) => e === valor)) add(`valor fora da lista: ${JSON.stringify(valor)}`);
  if (typeof valor === 'string') {
    if (esquema.minLength !== undefined && comprimento(valor) < esquema.minLength) add(`texto curto demais (mínimo ${esquema.minLength})`);
    if (esquema.maxLength !== undefined && comprimento(valor) > esquema.maxLength) add(`texto longo demais (máximo ${esquema.maxLength})`);
    if (esquema.format === 'cor-hex' && !ehCorHex(valor)) add('cor deveria estar no formato #RRGGBB');
    if (esquema.format === 'cor-hex-ou-vazio' && valor !== '' && !ehCorHex(valor)) add('cor deveria estar no formato #RRGGBB ou vazia');
  }
  if (typeof valor === 'number') {
    if (esquema.minimum !== undefined && valor < esquema.minimum) add(`número menor que ${esquema.minimum}`);
    if (esquema.maximum !== undefined && valor > esquema.maximum) add(`número maior que ${esquema.maximum}`);
  }
  if (Array.isArray(valor)) {
    if (esquema.minItems !== undefined && valor.length < esquema.minItems) add(`lista com menos de ${esquema.minItems} itens`);
    if (esquema.maxItems !== undefined && valor.length > esquema.maxItems) add(`lista com mais de ${esquema.maxItems} itens`);
    if (esquema.items) valor.forEach((item, i) => erros.push(...validar(esquema.items, item, raiz, `${caminho}[${i}]`)));
  }
  if (tipoDe(valor) === 'object') {
    for (const chave of esquema.required || []) {
      if (!(chave in valor)) erros.push({ caminho: `${caminho}.${chave}`, problema: 'campo obrigatório ausente' });
    }
    const props = esquema.properties || {};
    for (const [chave, sub] of Object.entries(valor)) {
      if (props[chave]) erros.push(...validar(props[chave], sub, raiz, `${caminho}.${chave}`));
      else if (esquema.additionalProperties === false) erros.push({ caminho: `${caminho}.${chave}`, problema: 'chave desconhecida' });
      else if (esquema.additionalProperties && typeof esquema.additionalProperties === 'object') {
        erros.push(...validar(esquema.additionalProperties, sub, raiz, `${caminho}.${chave}`));
      }
    }
  }
  return erros;
}

const cache = new Map();
export function esquema(nome) {
  if (!cache.has(nome)) {
    const arquivo = path.join(KIT, 'esquemas', `${nome}.schema.json`);
    cache.set(nome, JSON.parse(fs.readFileSync(arquivo, 'utf8')));
  }
  return cache.get(nome);
}

export function validarCom(nome, valor) {
  return validar(esquema(nome), valor);
}
