// Mede onde fica o rosto no take (YuNet) e grava rosto.json. O ./estudio cortar já faz isso;
// este comando serve para projeto cortado antes da medida existir, sem cortar de novo.
import { abrirProjeto, exigirArquivo } from '../lib/projeto.mjs';
import { progresso } from '../lib/executar.mjs';
import { medirRostoDoTake } from '../lib/rosto.mjs';

export default async function rosto({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  exigirArquivo(projeto.arq('take.mp4'));
  progresso('Medindo onde fica o seu rosto...');
  const avisos = [];
  const dados = await medirRostoDoTake(projeto, avisos);
  return {
    ok: true,
    resumo: dados ? `Rosto medido em ${Math.round(dados.presenca * 100)}% do vídeo.` : 'Não consegui medir o rosto.',
    avisos,
    arquivos: dados ? { rosto: projeto.rel('rosto.json') } : {},
    dados: dados || {},
  };
}
