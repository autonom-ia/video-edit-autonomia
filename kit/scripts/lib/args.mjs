// Leitura dos argumentos "--nome valor" de cada comando.
import { falha } from './saida.mjs';

export function lerArgs(lista) {
  const posicionais = [];
  const opcoes = {};
  for (let i = 0; i < lista.length; i += 1) {
    const a = lista[i];
    if (a.startsWith('--') && a.length > 2) {
      const nome = a.slice(2);
      const prox = lista[i + 1];
      if (prox === undefined || (prox.startsWith('--') && prox.length > 2)) opcoes[nome] = true;
      else {
        opcoes[nome] = prox;
        i += 1;
      }
    } else {
      posicionais.push(a);
    }
  }
  return { posicionais, opcoes };
}

export function exigir(opcoes, nome) {
  const v = opcoes[nome];
  if (v === undefined || v === true || v === '') falha('ARGUMENTO_FALTANDO', { argumento: `--${nome}` });
  return String(v);
}

export function escolha(opcoes, nome, permitidos, padrao) {
  const v = opcoes[nome] === undefined ? padrao : opcoes[nome];
  if (v === undefined) falha('ARGUMENTO_FALTANDO', { argumento: `--${nome}`, opcoes: permitidos });
  if (!permitidos.includes(String(v))) falha('ARGUMENTO_INVALIDO', { argumento: `--${nome}`, valor: String(v), opcoes: permitidos });
  return String(v);
}

export function inteiro(opcoes, nome, padrao, min = 1, max = 1000) {
  if (opcoes[nome] === undefined && padrao === undefined) falha('ARGUMENTO_FALTANDO', { argumento: `--${nome}` });
  const v = opcoes[nome] === undefined ? padrao : Number(opcoes[nome]);
  if (!Number.isInteger(v) || v < min || v > max) falha('ARGUMENTO_INVALIDO', { argumento: `--${nome}`, valor: String(opcoes[nome]) });
  return v;
}
