// Mixagem final: vídeo copiado, áudio estéreo, ducking só pela voz, −14 LUFS e pico ≤ −1 dBTP.
// Música: --musica N (número que o aluno escolheu no F-06, de escolha-da-musica/escolhas.json)
// ou --opcao N --esquema E (opção da pasta trilha); ou --sem-musica.
// A escolha é do aluno: vem com --resposta "<palavras dele>", ou repete a música já escolhida.
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
import { aplicarGate, conferirMusica } from '../lib/decisoes.mjs';

// Traduz o número da escolha do aluno (musica-N) para a opção e o jeito de mixar.
function opcaoDaEscolha(projeto, opcoes) {
  const numero = inteiro(opcoes, 'musica', undefined, 1, 3);
  const escolhas = lerJson(projeto.arq(PASTA_ESCOLHA, 'escolhas.json'), []);
  const achada = escolhas.find((e) => e.musica === numero);
  if (!achada) falha('ARGUMENTO_INVALIDO', { argumento: '--musica', valor: String(numero), opcoes: escolhas.map((e) => e.musica) });
  return { opcao: achada.opcao, esquemaNome: achada.esquema };
}

function escolhaDaMusica(projeto, opcoes) {
  if (opcoes.musica !== undefined) return opcaoDaEscolha(projeto, opcoes);
  return { opcao: inteiro(opcoes, 'opcao', undefined, 1, 50), esquemaNome: escolha(opcoes, 'esquema', ESQUEMAS) };
}

export default async function mixar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const semMusica = opcoes['sem-musica'] === true;
  const ctx = await contextoDaMixagem(projeto);
  const saida = projeto.arq('final-mix.mp4');
  const escolhida = semMusica ? null : escolhaDaMusica(projeto, opcoes);
  const gate = semMusica ? 'sem-musica' : `opcao-${escolhida.opcao}:${escolhida.esquemaNome}`;
  const recusa = conferirMusica(lerEstado(projeto), gate, opcoes.resposta);
  if (recusa) falha(recusa.codigo, recusa.dados);
  let info;
  let ficha = null;
  progresso('Conferindo tudo e finalizando...');
  if (semMusica) {
    info = await executarMixagem({ ...ctx, musica: null, esquema: null, saida });
  } else {
    const { opcao, esquemaNome } = escolhida;
    const musica = exigirArquivo(projeto.arq('trilha', `opcao-${opcao}.mp3`), 'SEM_MUSICA_BOA');
    ficha = lerJson(projeto.arq('trilha', `opcao-${opcao}.json`), null);
    info = await executarMixagem({ ...ctx, musica, esquema: lerEsquema(esquemaNome), saida });
    if (ficha) {
      const arqUsadas = path.join(PASTAS.marca, 'musicas-usadas.json');
      const usadas = lerJson(arqUsadas, []).filter((m) => !(String(m.id) === String(ficha.id) && m.projeto === projeto.nome));
      escreverJson(arqUsadas, [...usadas, { id: ficha.id, titulo: ficha.titulo, autor: ficha.autor, projeto: projeto.nome, data: hoje() }]);
    }
  }
  fs.rmSync(ctx.pastaTmp, { recursive: true, force: true });
  escreverJson(projeto.arq('trilha', 'mixagem.json'), { com_musica: !semMusica, gate, ...info });
  const estado = lerEstado(projeto);
  const comGate = typeof opcoes.resposta === 'string' && opcoes.resposta.trim()
    ? aplicarGate(estado, 'trilha', gate, opcoes.resposta, new Date().toISOString()).estado
    : estado;
  salvarEstado(projeto, { ...comGate, etapa: 'qa' });
  return {
    ok: true,
    resumo: semMusica ? 'Som final pronto, sem música.' : `Som final pronto com a música ${ficha ? `"${ficha.titulo}"` : ''}.`,
    arquivos: { final_mix: projeto.rel('final-mix.mp4'), mixagem: projeto.rel('trilha', 'mixagem.json') },
    dados: { gate, ...info },
  };
}
