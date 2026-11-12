// Lê e atualiza o estado do projeto: etapa, gates (decisões do aluno), notas do avaliador e notas.
// Gate só fecha com --resposta "<palavras do aluno>".
import { abrirProjeto, lerEstado, salvarEstado, ETAPAS, GATES } from '../lib/projeto.mjs';
import { aplicarGate, registrarAvaliacao } from '../lib/decisoes.mjs';
import { falha } from '../lib/saida.mjs';

const TIPOS_DE_AVALIACAO = ['roteiro', 'video'];

export default async function estado({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  let atual = lerEstado(projeto);
  let mudou = false;
  if (opcoes.etapa !== undefined) {
    const etapa = String(opcoes.etapa);
    if (!ETAPAS.includes(etapa)) falha('ARGUMENTO_INVALIDO', { argumento: '--etapa', valor: etapa, opcoes: ETAPAS });
    atual = { ...atual, etapa };
    mudou = true;
  }
  if (opcoes.gate !== undefined) {
    const texto = String(opcoes.gate);
    const i = texto.indexOf('=');
    if (i <= 0) falha('ARGUMENTO_INVALIDO', { argumento: '--gate', valor: texto, formato: 'nome=valor' });
    const nome = texto.slice(0, i).trim();
    const valor = texto.slice(i + 1).trim();
    if (!GATES.includes(nome)) falha('ARGUMENTO_INVALIDO', { argumento: '--gate', valor: nome, opcoes: GATES });
    const r = aplicarGate(atual, nome, valor, opcoes.resposta, new Date().toISOString());
    if (r.erro) falha(r.erro.codigo, r.erro.dados);
    atual = r.estado;
    mudou = true;
  }
  if (opcoes['nota-revisor'] !== undefined) {
    const tipo = opcoes.tipo === undefined ? 'video' : String(opcoes.tipo);
    if (!TIPOS_DE_AVALIACAO.includes(tipo)) falha('ARGUMENTO_INVALIDO', { argumento: '--tipo', valor: tipo, opcoes: TIPOS_DE_AVALIACAO });
    const copia = opcoes['parece-copia'] === undefined ? 'nao' : String(opcoes['parece-copia']);
    if (!['sim', 'nao'].includes(copia)) falha('ARGUMENTO_INVALIDO', { argumento: '--parece-copia', valor: copia, opcoes: ['sim', 'nao'] });
    const r = registrarAvaliacao(atual, { tipo, nota: opcoes['nota-revisor'], pareceCopia: copia === 'sim', quando: new Date().toISOString() });
    if (r.erro) falha(r.erro.codigo, r.erro.dados);
    atual = r.estado;
    mudou = true;
  }
  if (opcoes.nota !== undefined && opcoes.nota !== true) {
    atual = { ...atual, notas: [...(atual.notas || []), { quando: new Date().toISOString(), texto: String(opcoes.nota) }] };
    mudou = true;
  }
  if (mudou) atual = salvarEstado(projeto, atual);
  return {
    ok: true,
    resumo: mudou ? 'Estado do projeto atualizado.' : 'Estado do projeto lido.',
    arquivos: { estado: projeto.rel('estado.json') },
    dados: atual,
  };
}
