// Projeto de vídeo: pasta em projetos/<P>/ e o estado.json.
import fs from 'node:fs';
import path from 'node:path';
import { pastaProjeto, nomeDeProjetoValido, PASTAS, relativoARaiz } from './caminhos.mjs';
import { lerJson, escreverJson } from './json.mjs';
import { falha } from './saida.mjs';
import { exigir } from './args.mjs';

export const ETAPAS = [
  'pauta', 'gancho', 'roteiro', 'cenas', 'gravacao', 'recebido', 'corte', 'transcricao', 'alinhamento',
  'telas', 'montagem', 'previa', 'trilha', 'qa', 'revisao', 'final', 'postagem', 'medicao', 'concluido',
];

export const GATES = ['pauta', 'gancho', 'cenas', 'previa', 'trilha'];

export function abrirProjeto(opcoes) {
  const nome = exigir(opcoes, 'projeto');
  if (!nomeDeProjetoValido(nome)) falha('ARGUMENTO_INVALIDO', { argumento: '--projeto', valor: nome });
  const pasta = pastaProjeto(nome);
  if (!fs.existsSync(path.join(pasta, 'estado.json'))) falha('PROJETO_NAO_ACHADO', { projeto: nome });
  return {
    nome,
    pasta,
    arq: (...partes) => path.join(pasta, ...partes),
    rel: (...partes) => relativoARaiz(path.join(pasta, ...partes)),
  };
}

export function estadoNovo(nome, titulo, caminho) {
  return {
    versao: 1,
    projeto: nome,
    titulo,
    caminho,
    etapa: caminho === 'A' ? 'pauta' : 'gravacao',
    gates: { pauta: null, gancho: null, cenas: null, previa: null, trilha: null },
    rodadas: { roteiro: 0, video: 0 },
    notas: [],
    atualizado_em: new Date().toISOString(),
  };
}

export function lerEstado(projeto) {
  return lerJson(projeto.arq('estado.json'));
}

export function salvarEstado(projeto, estado) {
  const novo = { ...estado, atualizado_em: new Date().toISOString() };
  escreverJson(projeto.arq('estado.json'), novo);
  return novo;
}

export function mudarEtapa(projeto, etapa) {
  const estado = lerEstado(projeto);
  return salvarEstado(projeto, { ...estado, etapa });
}

export function exigirArquivo(caminho, codigo = 'ARQUIVO_NAO_ACHADO') {
  if (!fs.existsSync(caminho)) falha(codigo, { arquivo: relativoARaiz(caminho) });
  return caminho;
}

export function lerBriefing(obrigatorio = false) {
  const arquivo = path.join(PASTAS.marca, 'briefing.json');
  if (!fs.existsSync(arquivo)) {
    if (obrigatorio) falha('BRIEFING_INCOMPLETO', { faltando: ['briefing.json'] });
    return null;
  }
  return lerJson(arquivo);
}

export function lerMarca() {
  const arquivo = path.join(PASTAS.marca, 'marca.json');
  if (!fs.existsSync(arquivo)) falha('BRIEFING_INCOMPLETO', { faltando: ['marca.json'], dica: 'rode ./estudio marca' });
  return lerJson(arquivo);
}
