// Render de entrega (sem música). Só roda com a prévia aprovada pelo aluno.
import { abrirProjeto, lerEstado, mudarEtapa } from '../lib/projeto.mjs';
import { falha } from '../lib/saida.mjs';
import { renderizar } from '../lib/hyperframes.mjs';
import { progresso } from '../lib/executar.mjs';
import { conferirAntesDoRender } from './previa.mjs';
import { gateDoAluno } from '../lib/decisoes.mjs';

export default async function render({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const estado = lerEstado(projeto);
  if (!gateDoAluno(estado, 'previa', 'aprovado')) falha('PREVIA_NAO_APROVADA', {});
  const avisos = await conferirAntesDoRender(projeto);
  progresso('Montando o vídeo em qualidade de entrega...');
  const saida = projeto.arq('sem-trilha.mp4');
  await renderizar(projeto.arq('comp'), saida, 'delivery');
  mudarEtapa(projeto, 'trilha');
  return { ok: true, resumo: 'Vídeo em qualidade de entrega pronto (ainda sem música).', avisos, arquivos: { sem_trilha: projeto.rel('sem-trilha.mp4') } };
}
