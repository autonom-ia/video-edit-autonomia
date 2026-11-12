// Prévia em qualidade de rascunho, sem música. Antes, confere a marca e o espaço.
import { abrirProjeto, mudarEtapa } from '../lib/projeto.mjs';
import { reprovado, falha, aviso } from '../lib/saida.mjs';
import { renderizar } from '../lib/hyperframes.mjs';
import { abrir } from '../lib/abrir.mjs';
import { ESPACO } from '../lib/regras.mjs';
import { progresso } from '../lib/executar.mjs';
import { checarProjeto } from './checar-marca.mjs';
import { espacoLivreGb } from './espaco.mjs';

export async function conferirAntesDoRender(projeto) {
  const marca = await checarProjeto(projeto);
  if (marca.resultado === 'REPROVADO') reprovado('MARCA_REPROVADA', { problemas: marca.problemas.slice(0, 20) });
  const livre = espacoLivreGb();
  if (livre < ESPACO.minimoGb) falha('POUCO_ESPACO_RENDER', { livre_gb: livre });
  return livre < ESPACO.avisoRenderGb ? [aviso('POUCO_ESPACO_RENDER', { livre_gb: livre })] : [];
}

export default async function previa({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const avisos = await conferirAntesDoRender(projeto);
  progresso('Fazendo a prévia...');
  const saida = projeto.arq('previa.mp4');
  await renderizar(projeto.arq('comp'), saida, 'draft');
  mudarEtapa(projeto, 'previa');
  abrir(saida);
  return { ok: true, resumo: 'Prévia pronta e aberta.', avisos, arquivos: { previa: projeto.rel('previa.mp4') } };
}
