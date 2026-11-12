// Página de aprovação (GATE 1): uma página HTML, letra grande, sem nada técnico.
// Mostra a fala, o que aparece escrito na tela e 3 imagens de referência das cenas.
// Abre no navegador. Lê roteiro.md (obrigatório) e cenas.json (se houver).
// --sem-imagens: não gera as imagens que faltarem (usa só as que já existem).
import fs from 'node:fs';
import { abrirProjeto, lerEstado, exigirArquivo, lerMarca } from '../lib/projeto.mjs';
import { aviso, falha } from '../lib/saida.mjs';
import { escreverTexto, lerJson } from '../lib/json.mjs';
import { abrir } from '../lib/abrir.mjs';
import { tokensCss } from '../lib/marca.mjs';
import { escaparHtml as e, palavras } from '../lib/texto.mjs';
import { medirFala } from './tempo-de-fala.mjs';
import { amostrasDeEstilo } from './amostras.mjs';

export const ARQUIVO_PAGINA = 'aprovacao.html';
export const IMAGENS = Object.freeze(['estilo-1.png', 'estilo-2.png', 'estilo-3.png']);

const CORES_NEUTRAS = '--principal: #1f3a5f; --destaque: #e07a2f; --papel: #fbf8f3; --tinta: #1d1d1f; --fonte-titulo: sans-serif; --fonte-leitura: sans-serif; --peso-titulo: 800;';

// Texto visível de uma tela, na ordem em que aparece. Só os campos que viram letra na tela.
export function textoDaTela(tela) {
  const c = (tela && tela.campos) || {};
  const partes = [];
  const por = (v) => {
    const t = String(v === undefined || v === null ? '' : v).trim();
    if (t) partes.push(t);
  };
  if (tela && tela.tipo === 'conversa') (c.mensagens || []).forEach((m) => por(m && m.texto));
  else if (tela && tela.tipo === 'prompt') { por(c.prompt); por(c.resposta); }
  else if (tela && tela.tipo === 'cta') { por(c.frase); por(c.palavra); }
  else {
    por(c.titulo);
    por(c.numero);
    por(c.texto);
    (c.itens || []).forEach(por);
    por(c.apoio);
  }
  return partes;
}

const inicioDaFala = (fala, n = 6) => {
  const ps = palavras(fala);
  return ps.length > n ? `${ps.slice(0, n).join(' ')}...` : ps.join(' ');
};

// Lista "quando / o que aparece escrito", em linguagem de gente.
export function escritoNaTela(cenas) {
  if (!cenas || !Array.isArray(cenas.cenas)) return [];
  const itens = [];
  const g = cenas.titulo_gancho;
  if (g && String(g.texto || '').trim()) itens.push({ quando: 'No começo do vídeo', textos: [g.texto, g.publico].filter((t) => String(t || '').trim()) });
  const telas = Array.isArray(cenas.telas) ? cenas.telas : [];
  for (const cena of cenas.cenas) {
    if (!cena || !cena.tela) continue;
    const tela = telas.find((t) => t && t.id === cena.tela);
    const textos = textoDaTela(tela);
    if (textos.length) itens.push({ quando: `Quando você diz "${inicioDaFala(cena.fala)}"`, textos });
  }
  return itens;
}

export function montarPagina({ titulo, blocos, escrito, imagens, marca }) {
  const fala = blocos.map((b, i) => `<li><span class="n">${i + 1}</span><p>${e(b.texto)}</p></li>`).join('\n');
  const tela = escrito.length
    ? escrito.map((x) => `<li><b>${e(x.quando)}</b>${x.textos.map((t) => `<p>${e(t)}</p>`).join('')}</li>`).join('\n')
    : '<li><p>Neste vídeo, só a legenda da sua fala aparece escrita.</p></li>';
  const fotos = imagens.length
    ? `<h2>Como as cenas vão ficar</h2>\n<p class="sub">São só exemplos. No vídeo, no lugar do cinza, é você.</p>\n<div class="fotos">${imagens.map((src, i) => `<img src="${e(src)}" alt="Exemplo de cena ${i + 1}" />`).join('')}</div>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Para aprovar · ${e(titulo)}</title>
<style>
:root { ${marca ? tokensCss(marca) : CORES_NEUTRAS} }
* { box-sizing: border-box; }
body { margin: 0; background: var(--papel); color: var(--tinta); font: 500 24px/1.5 var(--fonte-leitura); }
main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
h1 { font: var(--peso-titulo) 40px/1.15 var(--fonte-titulo); margin: 0 0 8px; }
h2 { font: var(--peso-titulo) 30px/1.2 var(--fonte-titulo); color: var(--principal); margin: 44px 0 12px; }
.sub { opacity: .75; margin: 0 0 16px; }
ol, ul { list-style: none; padding: 0; margin: 0; }
li { background: #ffffff; border-radius: 18px; padding: 18px 22px; margin: 14px 0; }
.fala li { display: flex; gap: 16px; align-items: flex-start; }
.fala .n { flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--principal); color: var(--papel); font-weight: 800; display: grid; place-items: center; }
.fala p { font-size: 30px; line-height: 1.4; margin: 0; }
.tela b { display: block; font-size: 20px; opacity: .7; margin-bottom: 6px; }
.tela p { font-size: 28px; margin: 4px 0; }
.fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.fotos img { width: 100%; border-radius: 14px; display: block; }
.fim { margin-top: 48px; font-size: 26px; background: var(--principal); color: var(--papel); border-radius: 18px; padding: 20px 22px; }
@media (max-width: 560px) { .fotos { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
<h1>${e(titulo)}</h1>
<p class="sub">Leia com calma. Se estiver bom, volte para a conversa e responda.</p>
<h2>O que você vai falar</h2>
<ol class="fala">
${fala}
</ol>
<h2>O que aparece escrito na tela</h2>
<ul class="tela">
${tela}
</ul>
${fotos}
<p class="fim">Gostou? Volte para a conversa e responda. Quer mudar alguma coisa? É só dizer o quê.</p>
</main>
</body>
</html>
`;
}

function marcaOuNada() {
  try {
    return lerMarca();
  } catch {
    return null;
  }
}

async function imagensDeReferencia(projeto, gerar, avisos) {
  const existentes = () => IMAGENS.filter((n) => fs.existsSync(projeto.arq('amostras', n)));
  if (existentes().length < IMAGENS.length && gerar && fs.existsSync(projeto.arq('cenas.json'))) {
    try {
      await amostrasDeEstilo(projeto);
    } catch (erro) {
      avisos.push(aviso('IMAGENS_DE_REFERENCIA_FALTARAM', { detalhe: erro.codigo || String(erro.message || erro) }));
    }
  }
  return existentes().map((n) => `amostras/${n}`);
}

export default async function paginaDeAprovacao({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const estado = lerEstado(projeto);
  const roteiro = fs.readFileSync(exigirArquivo(projeto.arq('roteiro.md')), 'utf8');
  const { blocos } = medirFala(roteiro);
  if (!blocos.length) falha('ROTEIRO_SEM_FALA', { arquivo: projeto.rel('roteiro.md') });
  const cenas = lerJson(projeto.arq('cenas.json'), null);
  const avisos = [];
  const imagens = await imagensDeReferencia(projeto, opcoes['sem-imagens'] !== true, avisos);
  const html = montarPagina({ titulo: estado.titulo || projeto.nome, blocos, escrito: escritoNaTela(cenas), imagens, marca: marcaOuNada() });
  const arquivo = projeto.arq(ARQUIVO_PAGINA);
  escreverTexto(arquivo, html);
  abrir(arquivo);
  return {
    ok: true,
    resumo: 'Abri no navegador a página para aprovar o vídeo.',
    avisos,
    arquivos: { pagina: projeto.rel(ARQUIVO_PAGINA) },
    dados: { blocos: blocos.length, imagens: imagens.length, textos_na_tela: escritoNaTela(cenas).length },
  };
}
