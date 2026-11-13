// Escreve a fala palavra por palavra (com o tempo de cada uma) do vídeo bruto ou do take cortado.
import { daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, mudarEtapa, exigirArquivo } from '../lib/projeto.mjs';
import { escolha } from '../lib/args.mjs';
import { lerJson } from '../lib/json.mjs';
import { validarCom } from '../lib/validar.mjs';
import { falha } from '../lib/saida.mjs';
import { rodarTranscricao } from '../lib/fala.mjs';
import { somDoBruto } from '../lib/som-do-bruto.mjs';

export default async function transcrever({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const fonte = escolha(opcoes, 'fonte', ['bruto', 'take']);
  let entrada;
  let nomeSaida;
  if (fonte === 'bruto') {
    const origem = lerJson(exigirArquivo(projeto.arq('bruto', 'origem.json')));
    // Transcreve o som extraído pelo ffmpeg: os tempos ficam no mesmo relógio do corte.
    entrada = await somDoBruto(projeto, exigirArquivo(daRaiz(origem.arquivo), 'SEM_VIDEO'), origem);
    nomeSaida = 'transcricao-bruta.json';
  } else {
    entrada = exigirArquivo(projeto.arq('voz.wav'));
    nomeSaida = 'transcricao-take.json';
  }
  const saida = projeto.arq(nomeSaida);
  await rodarTranscricao(entrada, saida);
  const dados = lerJson(saida);
  const erros = validarCom('transcricao', dados);
  if (erros.length) falha('TRANSCRICAO_FALHOU', { problemas: erros.slice(0, 5) });
  if (fonte === 'take') mudarEtapa(projeto, 'transcricao');
  return {
    ok: true,
    resumo: `Escrevi ${dados.palavras.length} palavras (${Math.round(dados.duracao_s)} s de áudio).`,
    arquivos: { transcricao: projeto.rel(nomeSaida) },
    dados: { palavras: dados.palavras.length, duracao_s: dados.duracao_s, modelo: dados.modelo },
  };
}
