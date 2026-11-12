// A última linha de todo comando é um JSON numa linha só (spec D.3).
// Erros e avisos usam códigos de kit/mensagens.json.
import fs from 'node:fs';
import path from 'node:path';
import { KIT } from './caminhos.mjs';
import { sanear } from './executar.mjs';

export class KitErro extends Error {
  constructor(codigo, dados = {}, sair = 1) {
    super(codigo);
    this.codigo = codigo;
    this.dados = dados;
    this.sair = sair;
  }
}

// Erro de execução (saída 1).
export function falha(codigo, dados = {}) {
  throw new KitErro(codigo, dados, 1);
}

// Reprovação de validação, marca ou QA (saída 2).
export function reprovado(codigo, dados = {}) {
  throw new KitErro(codigo, dados, 2);
}

export function aviso(codigo, dados = {}) {
  return { codigo, dados };
}

let cacheMensagens = null;
export function mensagens() {
  if (cacheMensagens) return cacheMensagens;
  try {
    cacheMensagens = JSON.parse(fs.readFileSync(path.join(KIT, 'mensagens.json'), 'utf8'));
  } catch {
    cacheMensagens = {};
  }
  return cacheMensagens;
}

export function textoDoCodigo(codigo) {
  const m = mensagens()[codigo];
  return m ? m.texto : '';
}

function limpar(valor) {
  if (typeof valor === 'string') return sanear(valor);
  if (Array.isArray(valor)) return valor.map(limpar);
  if (valor && typeof valor === 'object') {
    const novo = {};
    for (const [k, v] of Object.entries(valor)) novo[k] = limpar(v);
    return novo;
  }
  return valor;
}

export function imprimirResultado(comando, resultado) {
  const objeto = {
    ok: Boolean(resultado.ok),
    comando,
    arquivos: resultado.arquivos || {},
    resumo: resultado.resumo || '',
    avisos: resultado.avisos || [],
  };
  if (resultado.codigo) objeto.codigo = resultado.codigo;
  if (resultado.dados !== undefined) objeto.dados = resultado.dados;
  process.stdout.write(`${JSON.stringify(limpar(objeto))}\n`);
}

export function resultadoDeErro(erro) {
  if (erro instanceof KitErro) {
    return {
      ok: false,
      codigo: erro.codigo,
      dados: erro.dados,
      resumo: textoDoCodigo(erro.codigo) || erro.codigo,
      sair: erro.sair,
    };
  }
  return {
    ok: false,
    codigo: 'DESCONHECIDO',
    dados: { detalhe: sanear(String((erro && erro.stack) || erro)).split('\n').slice(0, 6).join('\n') },
    resumo: textoDoCodigo('DESCONHECIDO'),
    sair: 1,
  };
}
