// Decisões do aluno (gates) e notas do avaliador.
// Um gate só fecha com as palavras do aluno, que ficam gravadas no estado. Assim o agente não
// aprova sozinho o papel, a prévia ou a música, e a entrega não sai abaixo da nota mínima sem o
// aluno dizer "postar assim". Foi o que aconteceu no teste com o Codex em 12/11/2026 (Issue #8).
import { AVALIACAO } from './regras.mjs';

// Gates fechados com estes valores precisam da resposta do aluno.
const VALORES_SEM_RESPOSTA = new Set(['', 'null']);

function textoDaResposta(resposta) {
  if (typeof resposta !== 'string') return '';
  return resposta.trim();
}

// Fecha (ou reabre, com valor vazio) um gate. Devolve o estado novo ou { erro }.
export function aplicarGate(estado, nome, valor, resposta, quando) {
  const gates = { ...(estado.gates || {}) };
  const respostas = { ...(estado.respostas || {}) };
  if (VALORES_SEM_RESPOSTA.has(valor)) {
    gates[nome] = null;
    delete respostas[nome];
    return { estado: { ...estado, gates, respostas } };
  }
  const texto = textoDaResposta(resposta);
  if (!texto) return { erro: { codigo: 'GATE_SEM_RESPOSTA', dados: { gate: nome } } };
  gates[nome] = valor;
  respostas[nome] = { valor, texto, quando };
  return { estado: { ...estado, gates, respostas } };
}

// O gate está fechado com este valor e com a resposta do aluno gravada.
export function gateDoAluno(estado, nome, valor) {
  const gates = estado.gates || {};
  const resposta = (estado.respostas || {})[nome];
  if (gates[nome] !== valor || !resposta) return false;
  return resposta.valor === valor && Boolean(textoDaResposta(resposta.texto));
}

// Grava a nota de uma rodada do avaliador. Devolve o estado novo ou { erro }.
export function registrarAvaliacao(estado, { tipo, nota, pareceCopia, quando }) {
  const numero = Number(String(nota).replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0 || numero > 10) {
    return { erro: { codigo: 'ARGUMENTO_INVALIDO', dados: { argumento: '--nota-revisor', valor: String(nota), opcoes: ['0 a 10'] } } };
  }
  const rodada = (estado.rodadas || {})[tipo] || 0;
  const avaliacao = { tipo, rodada, nota: numero, parece_copia: pareceCopia === true, quando };
  return { estado: { ...estado, avaliacoes: [...(estado.avaliacoes || []), avaliacao] } };
}

export function ultimaAvaliacao(estado, tipo) {
  const lista = (estado.avaliacoes || []).filter((a) => a.tipo === tipo);
  return lista.length ? lista[lista.length - 1] : null;
}

export function passou(avaliacao) {
  return Boolean(avaliacao) && avaliacao.nota >= AVALIACAO.notaMinima && !avaliacao.parece_copia;
}

// Pode entregar? Precisa da prévia do aluno, de uma avaliação do vídeo e da nota mínima,
// ou do "postar assim" do aluno.
export function conferirEntrega(estado) {
  if (!gateDoAluno(estado, 'previa', 'aprovado')) return { codigo: 'PREVIA_NAO_APROVADA', dados: {} };
  const ultima = ultimaAvaliacao(estado, 'video');
  if (!ultima) return { codigo: 'AVALIACAO_FALTANDO', dados: { tipo: 'video' } };
  if (passou(ultima)) return null;
  if (gateDoAluno(estado, 'postar_assim', 'sim')) return null;
  return {
    codigo: 'NOTA_ABAIXO_DO_MINIMO',
    dados: { nota: ultima.nota, rodada: ultima.rodada, parece_copia: ultima.parece_copia, nota_minima: AVALIACAO.notaMinima, rodadas_max: AVALIACAO.rodadasMax },
  };
}

// A música desta mixagem foi escolhida pelo aluno? Vale a resposta nova ou o gate já fechado
// com a mesma música (mixar de novo depois do avaliador, sem perguntar).
export function conferirMusica(estado, gate, resposta) {
  if (textoDaResposta(resposta)) return null;
  if (gateDoAluno(estado, 'trilha', gate)) return null;
  return { codigo: 'MUSICA_NAO_ESCOLHIDA', dados: { escolha: gate } };
}
