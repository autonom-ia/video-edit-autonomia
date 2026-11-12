// Grava o crédito da música nos metadados do MP4 (nunca na tela) e deixa o arquivo pronto para o celular.
import { abrirProjeto, lerEstado, exigirArquivo, mudarEtapa } from '../lib/projeto.mjs';
import { lerJson } from '../lib/json.mjs';
import { ffmpegOk } from '../lib/ffmpeg.mjs';

export function opcaoDoGate(gate) {
  if (!gate || !gate.startsWith('opcao-')) return null;
  const n = Number(gate.slice('opcao-'.length).split(':')[0]);
  return Number.isInteger(n) ? n : null;
}

export default async function creditar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const entrada = exigirArquivo(projeto.arq('final-mix.mp4'));
  const estado = lerEstado(projeto);
  const opcao = opcaoDoGate(estado.gates && estado.gates.trilha);
  const ficha = opcao ? lerJson(projeto.arq('trilha', `opcao-${opcao}.json`), null) : null;
  const texto = ficha ? ficha.texto_credito || `Trilha: "${ficha.titulo}", de ${ficha.autor} (${ficha.licenca}).` : '';
  const args = ['-y', '-i', entrada, '-map', '0', '-c', 'copy', '-movflags', '+faststart'];
  if (texto) args.push('-metadata', `comment=${texto}`, '-metadata', `description=${texto}`);
  args.push(projeto.arq('final.mp4'));
  await ffmpegOk(args, 'CREDITO_FALHOU');
  mudarEtapa(projeto, 'final');
  return {
    ok: true,
    resumo: texto ? 'Crédito da música gravado no arquivo.' : 'Vídeo final pronto (sem música, sem crédito a gravar).',
    arquivos: { final: projeto.rel('final.mp4') },
    dados: { credito: texto, exige_credito: Boolean(ficha && ficha.exige_credito) },
  };
}
