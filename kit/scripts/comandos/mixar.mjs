// Mixagem final: vídeo copiado, áudio estéreo, ducking só pela voz, −14 LUFS e pico ≤ −1 dBTP.
// Música: --musica N (número que o aluno escolheu no F-06, de escolha-da-musica/escolhas.json)
// ou --opcao N --esquema E (opção da pasta trilha); ou --sem-musica.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS } from '../lib/caminhos.mjs';
import { abrirProjeto, lerEstado, salvarEstado, exigirArquivo } from '../lib/projeto.mjs';
import { inteiro, escolha } from '../lib/args.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { mixar as executarMixagem } from '../lib/mixagem.mjs';
import { contextoDaMixagem, lerEsquema, ESQUEMAS } from '../lib/trilha.mjs';
import { hoje } from '../lib/texto.mjs';
import { progresso } from '../lib/executar.mjs';
import { falha } from '../lib/saida.mjs';
import { PASTA_ESCOLHA } from './variantes.mjs';

// Traduz o número da escolha do aluno (musica-N) para a opção e o jeito de mixar.
function opcaoDaEscolha(projeto, opcoes) {
  const numero = inteiro(opcoes, 'musica', undefined, 1, 3);
  const escolhas = lerJson(projeto.arq(PASTA_ESCOLHA, 'escolhas.json'), []);
  const achada = escolhas.find((e) => e.musica === numero);
  if (!achada) falha('ARGUMENTO_INVALIDO', { argumento: '--musica', valor: String(numero), opcoes: escolhas.map((e) => e.musica) });
  return { opcao: achada.opcao, esquemaNome: achada.esquema };
}

export default async function mixar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const semMusica = opcoes['sem-musica'] === true;
  const ctx = await contextoDaMixagem(projeto);
  const saida = projeto.arq('final-mix.mp4');
  let info;
  let gate;
  let ficha = null;
  progresso('Conferindo tudo e finalizando...');
  if (semMusica) {
    info = await executarMixagem({ ...ctx, musica: null, esquema: null, saida });
    gate = 'sem-musica';
  } else {
    const { opcao, esquemaNome } = opcoes.musica !== undefined
      ? opcaoDaEscolha(projeto, opcoes)
      : { opcao: inteiro(opcoes, 'opcao', undefined, 1, 50), esquemaNome: escolha(opcoes, 'esquema', ESQUEMAS) };
    const musica = exigirArquivo(projeto.arq('trilha', `opcao-${opcao}.mp3`), 'SEM_MUSICA_BOA');
    ficha = lerJson(projeto.arq('trilha', `opcao-${opcao}.json`), null);
    info = await executarMixagem({ ...ctx, musica, esquema: lerEsquema(esquemaNome), saida });
    gate = `opcao-${opcao}:${esquemaNome}`;
    if (ficha) {
      const arqUsadas = path.join(PASTAS.marca, 'musicas-usadas.json');
      const usadas = lerJson(arqUsadas, []).filter((m) => !(String(m.id) === String(ficha.id) && m.projeto === projeto.nome));
      escreverJson(arqUsadas, [...usadas, { id: ficha.id, titulo: ficha.titulo, autor: ficha.autor, projeto: projeto.nome, data: hoje() }]);
    }
  }
  fs.rmSync(ctx.pastaTmp, { recursive: true, force: true });
  escreverJson(projeto.arq('trilha', 'mixagem.json'), { com_musica: !semMusica, gate, ...info });
  const estado = lerEstado(projeto);
  salvarEstado(projeto, { ...estado, etapa: 'qa', gates: { ...estado.gates, trilha: gate } });
  return {
    ok: true,
    resumo: semMusica ? 'Som final pronto, sem música.' : `Som final pronto com a música ${ficha ? `"${ficha.titulo}"` : ''}.`,
    arquivos: { final_mix: projeto.rel('final-mix.mp4'), mixagem: projeto.rel('trilha', 'mixagem.json') },
    dados: { gate, ...info },
  };
}
