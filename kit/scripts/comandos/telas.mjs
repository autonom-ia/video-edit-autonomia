// Valida a tabela de cenas e desenha cada tela em PNG. Texto estourado ganha faixa vermelha e reprova.
// Tela livre: a foto sai no meio da animação dela. Mídia: a foto mostra um quadro do vídeo ou a imagem.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/caminhos.mjs';
import { abrirProjeto, exigirArquivo, lerBriefing, lerMarca, mudarEtapa } from '../lib/projeto.mjs';
import { lerJson } from '../lib/json.mjs';
import { reprovado } from '../lib/saida.mjs';
import { validarCenas, faixaNoInstante, tamanhoPorFaixa } from '../lib/cenas.mjs';
import { htmlDaTela, htmlDaMidia } from '../lib/telas.mjs';
import { paginaDeAmostra, fotografarPagina, conferirEstouro } from '../lib/amostra.mjs';
import { lerTelaDeArquivo, pluginsCitados, tipoDeMidia } from '../lib/telas-livres.mjs';
import { ffmpegOk } from '../lib/ffmpeg.mjs';
import { FAIXA, MIDIA } from '../lib/regras.mjs';
import { relativoARaiz } from '../lib/caminhos.mjs';
import { progresso } from '../lib/executar.mjs';

export function conferirTabela(projeto) {
  const dados = lerJson(exigirArquivo(projeto.arq('cenas.json')));
  const { problemas, avisos } = validarCenas(dados, { briefing: lerBriefing(false), pastaProjeto: projeto.pasta });
  if (problemas.length) {
    const soOrigem = problemas.every((p) => p.tipo === 'origem');
    reprovado(soOrigem ? 'NUMERO_SEM_ORIGEM' : 'CENAS_INVALIDAS', { problemas });
  }
  return { dados, avisos };
}

const urlDe = (caminho) => pathToFileURL(caminho).href;

// Na foto da tela livre, assets/midia aponta para a pasta midia do projeto, e a animação
// registrada roda numa linha do tempo parada no meio do tempo no ar.
export function paginaDaTelaLivre(tela, fragmento, projeto) {
  const midia = `${urlDe(projeto.arq(MIDIA.pasta))}/`;
  const html = fragmento.split('assets/midia/').join(midia);
  const gsap = path.join(RAIZ, 'node_modules', 'gsap', 'dist');
  const scripts = ['gsap', ...pluginsCitados(fragmento)].map((nome) => `<script src="${urlDe(path.join(gsap, `${nome}.min.js`))}"></script>`);
  const duracao = Math.max(0.5, tela.sai - tela.entra);
  const instante = Math.max(0.3, Math.min(duracao * 0.7, duracao - 0.4));
  const rodar = `<script>(function(){var f=(window.__telaLivre||{})[${JSON.stringify(tela.id)}];if(typeof f!=='function'||typeof gsap==='undefined')return;var tl=gsap.timeline({paused:true});var sel=${JSON.stringify(`#tela-${tela.id}`)};f(tl,{sel:sel,el:document.querySelector(sel),entrada:0,entra:0,sai:${duracao},duracao:${duracao}});tl.seek(${instante});})();</script>`;
  return { tela: `${scripts.join('')}${htmlDaTela(tela, { fragmento: html })}${rodar}` };
}

async function fotoDaMidia(tela, caminho, faixa, projeto) {
  let fonte = caminho;
  if (tipoDeMidia(caminho) === 'video') {
    fonte = projeto.arq('telas', `${tela.id}-quadro.jpg`);
    fs.mkdirSync(path.dirname(fonte), { recursive: true });
    await ffmpegOk(['-y', '-ss', '0.5', '-i', caminho, '-frames:v', '1', '-q:v', '3', fonte]);
  }
  return htmlDaMidia(tela, { alturaPx: faixa === 0 ? 1920 : FAIXA.alturaPx[faixa], src: urlDe(fonte) });
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
    let htmlTela;
    if (tela.tipo === 'livre') {
      const lido = lerTelaDeArquivo(tela, projeto.pasta);
      htmlTela = paginaDaTelaLivre(tela, lido.conteudo || '', projeto).tela;
    } else if (tela.tipo === 'midia') {
      htmlTela = await fotoDaMidia(tela, lerTelaDeArquivo(tela, projeto.pasta).caminho, faixa, projeto);
    } else {
      htmlTela = htmlDaTela(tela, { tamanho: tamanhoPorFaixa(faixa), solta: faixa === 0, marca });
    }
    const html = paginaDeAmostra({ marca, faixa, tela: htmlTela, rotulo: `${tela.id} · faixa ${faixa}` });
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
