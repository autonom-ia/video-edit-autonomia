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

// Projeto de antes das respostas: os gates já fechados viram respostas, para que fechar um gate
// novo não desfaça os antigos.
const TEXTO_LEGADO = 'aprovado antes de o estúdio gravar as respostas';
function respostasDoLegado(gates, quando) {
  const respostas = {};
  for (const [nome, valor] of Object.entries(gates)) {
    if (valor !== null && valor !== undefined) respostas[nome] = { valor, texto: TEXTO_LEGADO, quando };
  }
  return respostas;
}

// Fecha (ou reabre, com valor vazio) um gate. Devolve o estado novo ou { erro }.
export function aplicarGate(estado, nome, valor, resposta, quando) {
  const gates = { ...(estado.gates || {}) };
  const respostas = estado.respostas === undefined ? respostasDoLegado(gates, estado.atualizado_em || quando) : { ...estado.respostas };
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
// Projeto criado antes das respostas (sem o campo respostas) vale como estava,
// para não travar no meio quem atualizou o estúdio com um vídeo em andamento.
export function gateDoAluno(estado, nome, valor) {
  const gates = estado.gates || {};
  if (estado.respostas === undefined) return gates[nome] === valor;
  const resposta = estado.respostas[nome];
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

// Pode entregar? Precisa da prévia do aluno, de uma avaliação do vídeo como ele está agora
// (feita depois da última mixagem) e da nota mínima, ou do "postar assim" do aluno dito
// depois dessa avaliação. mixadoEm: hora (ms) do final-mix.mp4, se existir.
export function conferirEntrega(estado, mixadoEm = null) {
  if (!gateDoAluno(estado, 'previa', 'aprovado')) return { codigo: 'PREVIA_NAO_APROVADA', dados: {} };
  const ultima = ultimaAvaliacao(estado, 'video');
  if (!ultima) return { codigo: 'AVALIACAO_FALTANDO', dados: { tipo: 'video', desatualizada: false } };
  if (mixadoEm !== null && Date.parse(ultima.quando) < mixadoEm) {
    return { codigo: 'AVALIACAO_FALTANDO', dados: { tipo: 'video', desatualizada: true } };
  }
  if (passou(ultima)) return null;
  if (decidiuDepois(estado, 'postar_assim', 'sim', ultima)) return null;
  return {
    codigo: 'NOTA_ABAIXO_DO_MINIMO',
    dados: { nota: ultima.nota, rodada: ultima.rodada, parece_copia: ultima.parece_copia, nota_minima: AVALIACAO.notaMinima, rodadas_max: AVALIACAO.rodadasMax },
  };
}

// O aluno decidiu depois de ver esta avaliação.
function decidiuDepois(estado, nome, valor, avaliacao) {
  if (!gateDoAluno(estado, nome, valor)) return false;
  const resposta = (estado.respostas || {})[nome];
  return Boolean(resposta) && Date.parse(resposta.quando) >= Date.parse(avaliacao.quando);
}

// A música desta mixagem foi escolhida pelo aluno? Vale a resposta nova ou o gate já fechado
// com a mesma música (mixar de novo depois do avaliador, sem perguntar).
export function conferirMusica(estado, gate, resposta) {
  if (textoDaResposta(resposta)) return null;
  if (gateDoAluno(estado, 'trilha', gate)) return null;
  return { codigo: 'MUSICA_NAO_ESCOLHIDA', dados: { escolha: gate } };
}
