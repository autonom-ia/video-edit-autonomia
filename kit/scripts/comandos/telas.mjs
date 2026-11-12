// Valida a tabela de cenas e desenha cada tela em PNG. Texto estourado ganha faixa vermelha e reprova.
import fs from 'node:fs';
import { abrirProjeto, exigirArquivo, lerBriefing, lerMarca, mudarEtapa } from '../lib/projeto.mjs';
import { lerJson } from '../lib/json.mjs';
import { reprovado } from '../lib/saida.mjs';
import { validarCenas, faixaNoInstante, tamanhoPorFaixa } from '../lib/cenas.mjs';
import { htmlDaTela } from '../lib/telas.mjs';
import { paginaDeAmostra, fotografarPagina, conferirEstouro } from '../lib/amostra.mjs';
import { relativoARaiz } from '../lib/caminhos.mjs';
import { progresso } from '../lib/executar.mjs';

export function conferirTabela(projeto) {
  const dados = lerJson(exigirArquivo(projeto.arq('cenas.json')));
  const { problemas, avisos } = validarCenas(dados, { briefing: lerBriefing(false) });
  if (problemas.length) {
    const soOrigem = problemas.every((p) => p.tipo === 'origem');
    reprovado(soOrigem ? 'NUMERO_SEM_ORIGEM' : 'CENAS_INVALIDAS', { problemas });
  }
  return { dados, avisos };
}

export default async function telas({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const marca = lerMarca();
  const { dados, avisos } = conferirTabela(projeto);
  const estourados = [];
  const arquivos = {};
  for (const tela of dados.telas || []) {
    progresso(`Desenhando a tela ${tela.id}...`);
    const faixa = faixaNoInstante(dados.cenas, tela.entra + 0.2);
    const html = paginaDeAmostra({
      marca,
      faixa,
      tela: htmlDaTela(tela, { tamanho: tamanhoPorFaixa(faixa), solta: faixa === 0, marca }),
      rotulo: `${tela.id} · faixa ${faixa}`,
    });
    const ruins = await conferirEstouro(html);
    const png = projeto.arq('telas', `${tela.id}.png`);
    await fotografarPagina(html, png);
    arquivos[tela.id] = relativoARaiz(png);
    if (ruins.length) estourados.push({ tela: tela.id, onde: ruins, imagem: relativoARaiz(png) });
  }
  if (estourados.length) reprovado('TELA_ESTOUROU', { problemas: estourados });
  if (fs.existsSync(projeto.arq('take.mp4'))) mudarEtapa(projeto, 'telas');
  return {
    ok: true,
    resumo: `Tabela de cenas aprovada; ${Object.keys(arquivos).length} tela(s) desenhada(s).`,
    avisos,
    arquivos,
    dados: { telas: Object.keys(arquivos).length, cenas: dados.cenas.length },
  };
}
