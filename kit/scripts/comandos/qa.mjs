// Conferência completa do MP4: formato, volume, pico, faststart, quadro 0, imagem parada,
// silêncio nas bordas, duração, som nas trocas de tela e trilha. Também tira 1 quadro por segundo
// e pede a segunda opinião do ouvido de som.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto, mudarEtapa, exigirArquivo } from '../lib/projeto.mjs';
import { reprovado } from '../lib/saida.mjs';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { conferirMp4, salvarRelatorio } from '../lib/qa.mjs';
import { earshotDisponivel } from '../lib/earshot.mjs';
import { progresso } from '../lib/executar.mjs';
import { ouvirArquivo } from './ouvir.mjs';

export default async function qa({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const nome = typeof opcoes.arquivo === 'string' ? path.basename(opcoes.arquivo) : 'final-mix.mp4';
  const arquivo = exigirArquivo(projeto.arq(nome));
  progresso('Conferindo o vídeo...');
  const rel = await conferirMp4({ arquivo, projeto });
  const pastaQa = projeto.arq('qa');
  const quadros = path.join(pastaQa, 'quadros');
  fs.rmSync(quadros, { recursive: true, force: true });
  fs.mkdirSync(quadros, { recursive: true });
  await ffmpeg(['-y', '-i', arquivo, '-vf', 'fps=1,scale=360:-2', '-q:v', '4', path.join(quadros, 'q-%03d.jpg')]);
  const ouvido = {};
  if (earshotDisponivel()) {
    progresso('Pedindo a segunda opinião do ouvido de som...');
    for (const modo of ['critique', 'timeline', 'sheet']) {
      const r = await ouvirArquivo(arquivo, modo, path.join(pastaQa, 'ouvido'));
      ouvido[modo] = r.ok ? projeto.rel(path.relative(projeto.pasta, r.saida)) : null;
    }
  }
  const relatorio = { ...rel, ouvido };
  salvarRelatorio(pastaQa, 'relatorio', relatorio);
  if (nome === 'final.mp4') salvarRelatorio(pastaQa, 'relatorio-final', relatorio);
  if (!rel.ok) reprovado('QA_REPROVADO', { reprovados: rel.itens.filter((i) => !i.ok), relatorio: projeto.rel('qa', 'relatorio.md') });
  mudarEtapa(projeto, 'revisao');
  return {
    ok: true,
    resumo: `Conferência aprovada: ${rel.itens.length} itens.`,
    arquivos: { relatorio: projeto.rel('qa', 'relatorio.json'), texto: projeto.rel('qa', 'relatorio.md'), quadros: projeto.rel('qa', 'quadros') },
    dados: { itens: rel.itens.map((i) => ({ id: i.id, ok: i.ok, texto: i.texto })), ouvido },
  };
}
