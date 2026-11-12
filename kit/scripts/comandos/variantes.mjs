// Para cada opção de música, mixa com o melhor esquema (equilibrada, abafada, silêncio) e mede.
// A opção que some no celular ou fica fora da distância voz/trilha vem marcada para não ser mostrada.
// As aprovadas (no máximo 3) são copiadas para projetos/<P>/escolha-da-musica/musica-1..3.mp4,
// na mesma numeração do texto F-06, e essa pasta é aberta. Só ela é mostrada ao aluno.
// Opção que já tem versão pronta (variante-N.mp4 e linha em variantes.json) não é refeita,
// a não ser com --refazer. Assim "musica --acrescentar" só mixa as novas.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto } from '../lib/projeto.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { escreverJson, lerJson } from '../lib/json.mjs';
import { mixar } from '../lib/mixagem.mjs';
import { contextoDaMixagem, lerEsquema, ESQUEMAS } from '../lib/trilha.mjs';
import { progresso } from '../lib/executar.mjs';
import { abrir } from '../lib/abrir.mjs';
import { descricaoDaMusica } from '../lib/openverse.mjs';

export const PASTA_ESCOLHA = 'escolha-da-musica';
export const MAXIMO_NA_ESCOLHA = 3;

const passou = (v) => Boolean(v && v.distancia_ok && v.celular_audivel);

async function melhorVersao(ctx, pasta, nome, opcao) {
  let escolhida = null;
  for (const esquemaNome of ESQUEMAS) {
    progresso(`Música ${opcao}: testando o jeito "${esquemaNome}"...`);
    const saida = path.join(pasta, `variante-${opcao}-${esquemaNome}.mp4`);
    const info = await mixar({ ...ctx, musica: path.join(pasta, nome), esquema: lerEsquema(esquemaNome), saida });
    const atual = { opcao, esquema: esquemaNome, lufs: info.lufs, distancia_voz_trilha_db: info.distancia_voz_trilha_db, celular_audivel: info.celular_audivel, distancia_ok: info.distancia_ok, saida };
    const maisPerto = escolhida && Math.abs(atual.distancia_voz_trilha_db - 14) < Math.abs(escolhida.distancia_voz_trilha_db - 14);
    const melhor = !escolhida || (passou(atual) && !passou(escolhida)) || (!passou(atual) && !passou(escolhida) && maisPerto);
    if (melhor) {
      if (escolhida) fs.rmSync(escolhida.saida, { force: true });
      escolhida = atual;
    } else {
      fs.rmSync(saida, { force: true });
    }
    if (passou(atual)) break;
  }
  const final = path.join(pasta, `variante-${opcao}.mp4`);
  fs.renameSync(escolhida.saida, final);
  return escolhida;
}

// Decide quais versões vão para a pasta da escolha: só as aprovadas, na ordem das opções, no máximo 3.
export function planejarEscolha(resultado, maximo = MAXIMO_NA_ESCOLHA) {
  return resultado
    .filter((r) => r.mostrar)
    .sort((a, b) => a.opcao - b.opcao)
    .slice(0, maximo)
    .map((r, i) => ({ musica: i + 1, opcao: r.opcao, esquema: r.esquema }));
}

function montarPastaDaEscolha(projeto, pasta, plano, fichas) {
  const destino = projeto.arq(PASTA_ESCOLHA);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  const escolhas = plano.map((p) => {
    fs.copyFileSync(path.join(pasta, `variante-${p.opcao}.mp4`), path.join(destino, `musica-${p.musica}.mp4`));
    const ficha = fichas[p.opcao] || {};
    return {
      ...p,
      arquivo: projeto.rel(PASTA_ESCOLHA, `musica-${p.musica}.mp4`),
      titulo: ficha.titulo || '',
      descricao: `música ${p.musica}: ${ficha.descricao || descricaoDaMusica(ficha)}`,
    };
  });
  escreverJson(path.join(destino, 'escolhas.json'), escolhas);
  return { destino, escolhas };
}

export default async function variantes({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const refazer = opcoes.refazer === true;
  const pasta = projeto.arq('trilha');
  const musicas = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((n) => n.startsWith('opcao-') && n.endsWith('.mp3')).sort() : [];
  if (!musicas.length) falha('SEM_MUSICA_BOA', { dica: 'rode ./estudio musica primeiro' });
  const anteriores = refazer ? [] : lerJson(path.join(pasta, 'variantes.json'), []);
  const ctx = await contextoDaMixagem(projeto);
  const resultado = [];
  const fichas = {};
  for (const nome of musicas) {
    const opcao = Number(nome.slice('opcao-'.length, -'.mp3'.length));
    fichas[opcao] = lerJson(path.join(pasta, `opcao-${opcao}.json`), {});
    const pronta = anteriores.find((a) => a.opcao === opcao);
    if (pronta && fs.existsSync(path.join(pasta, `variante-${opcao}.mp4`))) {
      resultado.push(pronta);
      continue;
    }
    const escolhida = await melhorVersao(ctx, pasta, nome, opcao);
    resultado.push({
      opcao,
      esquema: escolhida.esquema,
      lufs: escolhida.lufs,
      distancia_voz_trilha_db: escolhida.distancia_voz_trilha_db,
      celular_audivel: escolhida.celular_audivel,
      arquivo: projeto.rel('trilha', `variante-${opcao}.mp4`),
      mostrar: passou(escolhida),
    });
  }
  fs.rmSync(ctx.pastaTmp, { recursive: true, force: true });
  escreverJson(path.join(pasta, 'variantes.json'), resultado);
  const plano = planejarEscolha(resultado);
  const avisos = [];
  let escolhas = [];
  if (plano.length) {
    const montada = montarPastaDaEscolha(projeto, pasta, plano, fichas);
    escolhas = montada.escolhas;
    abrir(montada.destino);
  } else {
    fs.rmSync(projeto.arq(PASTA_ESCOLHA), { recursive: true, force: true });
  }
  if (plano.length < MAXIMO_NA_ESCOLHA) avisos.push(aviso('POUCAS_MUSICAS_APROVADAS', { aprovadas: plano.length, quero: MAXIMO_NA_ESCOLHA }));
  return {
    ok: true,
    resumo: plano.length
      ? `${plano.length} música(s) passaram no teste do celular. Abri a pasta ${PASTA_ESCOLHA} com musica-1 a musica-${plano.length}.`
      : 'Nenhuma música passou no teste do celular.',
    avisos,
    arquivos: { variantes: projeto.rel('trilha', 'variantes.json'), escolha: plano.length ? projeto.rel(PASTA_ESCOLHA) : '' },
    dados: { variantes: resultado, escolhas },
  };
}
