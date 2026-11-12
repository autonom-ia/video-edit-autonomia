// Entrega os 3 arquivos em 3-videos-prontos: vídeo, capa (quadro 0) e texto do post.
// Só entrega com a prévia aprovada pelo aluno e a nota mínima do avaliador (ou o "postar assim" dele).
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS, relativoARaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, lerEstado, exigirArquivo, mudarEtapa } from '../lib/projeto.mjs';
import { reprovado, falha } from '../lib/saida.mjs';
import { conferirEntrega } from '../lib/decisoes.mjs';
import { ffmpegOk } from '../lib/ffmpeg.mjs';
import { conferirMp4, salvarRelatorio } from '../lib/qa.mjs';
import { lerJson } from '../lib/json.mjs';
import { abrir } from '../lib/abrir.mjs';
import { slug, hoje } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';

async function qaDoFinal(projeto, final) {
  const arq = projeto.arq('qa', 'relatorio-final.json');
  const anterior = lerJson(arq, null);
  if (anterior && anterior.ok && fs.statSync(arq).mtimeMs >= fs.statSync(final).mtimeMs) return anterior;
  progresso('Conferindo o arquivo final...');
  const rel = await conferirMp4({ arquivo: final, projeto, rapido: true });
  salvarRelatorio(projeto.arq('qa'), 'relatorio-final', rel);
  return rel;
}

export default async function entregar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const mix = projeto.arq('final-mix.mp4');
  const bloqueio = conferirEntrega(lerEstado(projeto), fs.existsSync(mix) ? fs.statSync(mix).mtimeMs : null);
  if (bloqueio && bloqueio.codigo === 'NOTA_ABAIXO_DO_MINIMO') reprovado(bloqueio.codigo, bloqueio.dados);
  if (bloqueio) falha(bloqueio.codigo, bloqueio.dados);
  const final = exigirArquivo(projeto.arq('final.mp4'));
  const legenda = exigirArquivo(projeto.arq('postagem.txt'));
  const rel = await qaDoFinal(projeto, final);
  if (!rel.ok) reprovado('QA_REPROVADO', { reprovados: rel.itens.filter((i) => !i.ok), relatorio: projeto.rel('qa', 'relatorio-final.md') });
  const estado = lerEstado(projeto);
  fs.mkdirSync(PASTAS.prontos, { recursive: true });
  const base = `${hoje()}-${slug(estado.titulo || projeto.nome)}`;
  let nome = base;
  let n = 2;
  while (fs.existsSync(path.join(PASTAS.prontos, `${nome}.mp4`))) nome = `${base}-${n++}`;
  const video = path.join(PASTAS.prontos, `${nome}.mp4`);
  const capa = path.join(PASTAS.prontos, `${nome}-capa.jpg`);
  const texto = path.join(PASTAS.prontos, `${nome}-legenda.txt`);
  fs.copyFileSync(final, video);
  await ffmpegOk(['-y', '-i', final, '-frames:v', '1', '-q:v', '2', capa]);
  fs.copyFileSync(legenda, texto);
  mudarEtapa(projeto, 'postagem');
  abrir(PASTAS.prontos);
  return {
    ok: true,
    resumo: 'Reel entregue na pasta 3-videos-prontos.',
    arquivos: { video: relativoARaiz(video), capa: relativoARaiz(capa), legenda: relativoARaiz(texto) },
    dados: { nome },
  };
}
