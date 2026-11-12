// Lê e atualiza o estado do projeto: etapa, gates (decisões do aluno) e notas.
import { abrirProjeto, lerEstado, salvarEstado, ETAPAS, GATES } from '../lib/projeto.mjs';
import { falha } from '../lib/saida.mjs';

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
    atual = { ...atual, gates: { ...atual.gates, [nome]: valor === '' || valor === 'null' ? null : valor } };
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
