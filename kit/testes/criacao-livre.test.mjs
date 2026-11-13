// Testes da Issue #10 (soltar a criação): tela livre, mídia (gravação de tela), apps reais
// liberados, checagem de palavra só no texto visível e os três bugs do teste de 12/11/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textoVisivel, textosDeScript, textosDeContentCss } from '../scripts/lib/texto-visivel.mjs';
import { conferirFragmento, seletoresVazados, caminhoNoProjeto, pluginsCitados, tipoDeMidia } from '../scripts/lib/telas-livres.mjs';
import { validarCenas } from '../scripts/lib/cenas.mjs';
import { montarTelas, planejarSons } from '../scripts/lib/composicao.mjs';
import { checarTextos, liberadosPelosApps, listasProibidas } from '../scripts/comandos/checar-marca.mjs';
import { filtroDaMidia } from '../scripts/comandos/midia.mjs';
import { marcadoresDoMolde, conferirDuracoes } from '../scripts/comandos/montar.mjs';
import { obrigatoriosFaltando, lerCatalogo } from '../scripts/lib/marca.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(AQUI, '..');

const FRAGMENTO_BOM = `<style>
#tela-t02 .janela { position: absolute; left: 60px; top: 260px; width: 960px; }
#tela-t02 .janela b, #tela-t02 .cursor { color: var(--principal); }
@media (min-width: 10px) { #tela-t02 .janela { top: 270px; } }
@keyframes piscar { from { opacity: 0; } 50% { opacity: 1; } to { opacity: 0; } }
</style>
<div class="janela"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg><b>Codex</b> <span class="cursor">|</span></div>
<script>
window.__telaLivre = window.__telaLivre || {};
window.__telaLivre['t02'] = function (tl, ctx) {
  tl.fromTo(ctx.sel + ' .janela', { y: 40 }, { y: 0, duration: 0.5 }, ctx.entrada);
};
</script>`;

function projetoTemporario(arquivos) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-teste-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(pasta, rel)), { recursive: true });
    fs.writeFileSync(path.join(pasta, rel), conteudo);
  }
  return pasta;
}

function cenasCom(telas, extra = {}) {
  return {
    versao: 1,
    duracao_alvo_s: 10,
    titulo_gancho: { texto: 'Este Reel saiu de 3 frases' },
    cenas: [
      { id: 'c01', fala: 'Abro o Codex e colo a frase', inicio: 0, fim: 5, faixa: 0, tela: null },
      { id: 'c02', fala: 'E ele monta tudo sozinho', inicio: 5, fim: 10, faixa: 50, tela: telas[0] ? telas[0].id : null },
    ],
    telas,
    ...extra,
  };
}

// ---------- bug B1: "100%" no CSS travava a prévia ----------

test('texto visível ignora CSS, script, comentário e atributos', () => {
  const html = '<style>.a{width:100%}</style><!-- 100% --><div style="width:100%" data-x="100%">Garantia <b>total</b> &amp; já</div><script>var x="100%";</script>';
  assert.equal(textoVisivel(html), 'Garantia total & já');
});

test('palavra proibida no CSS não reprova; na tela reprova', () => {
  const termos = ['100%'];
  const css = { nome: 'comp/estilo.css', conteudo: '#root { width: 100%; }' };
  const html = { nome: 'comp/index.html', conteudo: '<style>.x{height:100%}</style><div>Resultado 100% garantido</div>' };
  const limpo = { nome: 'comp/index.html', conteudo: '<style>.x{height:100%}</style><div>Resultado garantido</div>' };
  assert.deepEqual(checarTextos([css], { cores: [], termos, coresDaMarca: [] }), []);
  assert.deepEqual(checarTextos([limpo], { cores: [], termos, coresDaMarca: [] }), []);
  assert.equal(checarTextos([html], { cores: [], termos, coresDaMarca: [] }).length, 1);
});

test('cor de app famoso continua contando no CSS', () => {
  const css = { nome: 'comp/estilo.css', conteudo: '.x { color: #25d366; }' };
  assert.equal(checarTextos([css], { cores: ['#25d366'], termos: [], coresDaMarca: [] }).length, 1);
});

// ---------- regra 30 nova: app real liberado ----------

test('app declarado libera o nome e as cores do grupo dele', () => {
  const padrao = lerCatalogo('proibidos-padrao.json');
  const lib = liberadosPelosApps(padrao, [{ nome: 'Codex', referencia: 'https://openai.com/codex', porque: 'o aluno usa' }]);
  assert.ok(lib.nomes.has('openai') && lib.nomes.has('chatgpt') && lib.nomes.has('codex'));
  assert.ok(lib.cores.has('#10a37f'));
  assert.equal(lib.cores.has('#25d366'), false);
});

test('lista proibida tira só o app declarado e mantém a lista do aluno', () => {
  const padrao = lerCatalogo('proibidos-padrao.json');
  const marca = { proibidos: { palavras: ['100%'], marcas: ['Concorrente X', ...padrao.marcas], cores: ['#25d366'] } };
  const briefing = { marcas_proibidas: ['Concorrente X', 'ChatGPT'] };
  const r = listasProibidas({ marca, padrao, briefing, appsReais: [{ nome: 'ChatGPT', referencia: 'x', porque: 'y' }] });
  assert.ok(r.termos.includes('Concorrente X'));
  assert.ok(r.termos.includes('ChatGPT'), 'o aluno proibiu ChatGPT; a liberação do vídeo não passa por cima');
  assert.equal(r.termos.includes('OpenAI'), false);
  assert.ok(r.termos.includes('WhatsApp'));
  assert.equal(r.cores.includes('#10a37f'), false);
  assert.ok(r.cores.includes('#25d366'));
});

test('cada cor da lista padrão pertence a um grupo de app', () => {
  const padrao = lerCatalogo('proibidos-padrao.json');
  const doGrupo = padrao.apps.flatMap((a) => a.cores).sort();
  assert.deepEqual([...padrao.cores].sort(), doGrupo);
  for (const grupo of padrao.apps) for (const nome of grupo.nomes) assert.ok(padrao.marcas.includes(nome), nome);
});

// ---------- tela livre: conferida pelo resultado ----------

test('fragmento bom passa; plugins citados são achados', () => {
  assert.deepEqual(conferirFragmento(FRAGMENTO_BOM, 't02'), []);
  assert.deepEqual(pluginsCitados('SplitText.create(x); MorphSVGPlugin'), ['MorphSVGPlugin', 'SplitText']);
});

test('fragmento com sorteio, relógio, internet, data-start ou CSS que vaza reprova', () => {
  const ruins = [
    'tl.to(x, { x: Math.random() * 10 })',
    'var d = new Date();',
    '<img src="https://exemplo.com/logo.png">',
    'tl.to(x, { rotation: 360, repeat: -1 })',
    '<video data-start="1"></video>',
    '<style>body { background: red; }</style>',
  ];
  for (const r of ruins) assert.equal(conferirFragmento(r, 't02').length, 1, r);
});

test('seletores: só os que não começam pela tela vazam', () => {
  const css = '/* x */ #tela-t09 .a, .b { color: red } @media (x) { #tela-t09 .c { top: 0 } html { margin: 0 } } @keyframes k { 0% { opacity: 0 } 100% { opacity: 1 } }';
  assert.deepEqual(seletoresVazados(css, 't09'), ['.b', 'html']);
});

test('caminho do arquivo não sai da pasta do projeto', () => {
  const pasta = projetoTemporario({});
  assert.ok(caminhoNoProjeto(pasta, 'telas-livres/t01.html'));
  assert.equal(caminhoNoProjeto(pasta, '../fora.html'), null);
  assert.equal(caminhoNoProjeto(pasta, '/etc/passwd'), null);
  assert.equal(caminhoNoProjeto(pasta, ''), null);
  assert.equal(tipoDeMidia('a.MOV'), 'video');
  assert.equal(tipoDeMidia('a.png'), 'imagem');
  assert.equal(tipoDeMidia('a.txt'), null);
});

test('cenas com tela livre e mídia: aprovam com arquivo certo e até 8 s no ar', () => {
  const pasta = projetoTemporario({ 'telas-livres/t02.html': FRAGMENTO_BOM, 'midia/gravacao.mp4': 'x' });
  const telas = [
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/t02.html', descricao: 'O Codex recebe a frase' }, entra: 5.2, sai: 9.8 },
    { id: 't03', tipo: 'midia', campos: { arquivo: 'midia/gravacao.mp4', descricao: 'Gravação real da tela', encaixe: 'conter' }, entra: 0.5, sai: 4.5 },
  ];
  const { problemas } = validarCenas(cenasCom(telas), { pastaProjeto: pasta });
  assert.deepEqual(problemas, []);
});

test('cenas com tela livre: arquivo faltando, sem descrição ou mais de 8 s reprova', () => {
  const pasta = projetoTemporario({ 'telas-livres/t02.html': FRAGMENTO_BOM });
  const casos = [
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/nao-existe.html', descricao: 'x' }, entra: 5, sai: 8 },
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/t02.html' }, entra: 5, sai: 8 },
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/t02.html', descricao: 'x' }, entra: 0.5, sai: 9.5 },
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/t02.html', descricao: 'x', entrada: 'louca' }, entra: 5, sai: 8 },
    { id: 't02', tipo: 'midia', campos: { arquivo: 'telas-livres/t02.html', descricao: 'x' }, entra: 5, sai: 8 },
  ];
  for (const tela of casos) {
    const { problemas } = validarCenas(cenasCom([tela]), { pastaProjeto: pasta });
    assert.ok(problemas.length >= 1, JSON.stringify(tela.campos));
  }
});

test('apps_reais: precisa de nome, referência, porquê e estar na fala', () => {
  const ok = validarCenas(cenasCom([], { apps_reais: [{ nome: 'Codex', referencia: 'https://openai.com/codex', porque: 'o aluno usa' }] }));
  assert.deepEqual(ok.problemas, []);
  const fora = validarCenas(cenasCom([], { apps_reais: [{ nome: 'Canva', referencia: 'x', porque: 'y' }] }));
  assert.equal(fora.problemas.length, 1);
  assert.ok(fora.problemas[0].problema.includes('citado_como'));
  const apelido = validarCenas(cenasCom([], { apps_reais: [{ nome: 'ChatGPT', referencia: 'x', porque: 'y', citado_como: 'monta tudo' }] }));
  assert.deepEqual(apelido.problemas, []);
  const incompleto = validarCenas(cenasCom([], { apps_reais: [{ nome: 'Codex' }] }));
  assert.equal(incompleto.problemas.length, 2);
});

// ---------- bug B2: passos.atual ----------

test('passos: "atual" conta do 0 e o erro diz isso com o número certo', () => {
  const tela = { id: 't01', tipo: 'passos', campos: { itens: ['Um', 'Dois', 'Três'], atual: 3 }, entra: 5, sai: 8 };
  const { problemas } = validarCenas(cenasCom([tela]));
  assert.equal(problemas.length, 1);
  assert.ok(problemas[0].problema.includes('o primeiro passo é 0'));
  assert.ok(problemas[0].problema.includes('o último é 2'));
  const certo = validarCenas(cenasCom([{ ...tela, campos: { ...tela.campos, atual: 2 } }]));
  assert.deepEqual(certo.problemas, []);
});

test('conversa: status deixou de ser obrigatório "online"', () => {
  const tela = { id: 't01', tipo: 'conversa', campos: { nome: 'Ana', mensagens: [{ de: 'outro', texto: 'Oi' }] }, entra: 5, sai: 8 };
  assert.deepEqual(validarCenas(cenasCom([tela])).problemas, []);
  const comStatus = { ...tela, campos: { ...tela.campos, status: 'digitando' } };
  assert.deepEqual(validarCenas(cenasCom([comStatus])).problemas, []);
});

// ---------- bug B3: "está no vídeo" ----------

test('briefing com CTA por vídeo não pede a entrega', () => {
  const base = { marca: { nome: 'X' }, nicho: { descricao: 'seguros' }, publico: { quem: 'donos', dores: ['tempo'] } };
  assert.deepEqual(obrigatoriosFaltando({ ...base, cta: { tipo: 'comentar_palavra', palavra: '', entrega: '' } }), ['cta.entrega']);
  assert.deepEqual(obrigatoriosFaltando({ ...base, cta: { tipo: 'comentar_palavra', palavra: '', entrega: '', por_video: true } }), []);
});

// ---------- composição ----------

test('composição: tela livre entra inteira; mídia vira vídeo fora de #telas', () => {
  const telas = [
    { id: 't02', tipo: 'livre', campos: { arquivo: 'telas-livres/t02.html', descricao: 'x', entrada: 'propria' }, entra: 5.2, sai: 9.8 },
    { id: 't03', tipo: 'midia', campos: { arquivo: 'midia/g.mp4', descricao: 'x' }, entra: 0.5, sai: 4.5 },
  ];
  const dados = cenasCom(telas);
  const r = montarTelas(dados, null, { livres: { t02: FRAGMENTO_BOM }, midias: { t03: { src: 'assets/midia/g.mp4', tipo: 'video' } }, duracao: 10 });
  assert.ok(r.html.includes('id="tela-t02"') && r.html.includes("window.__telaLivre['t02']"));
  assert.equal(r.html.includes('<video'), false);
  assert.ok(r.htmlMidias.includes('src="assets/midia/g.mp4"'));
  assert.ok(r.htmlMidias.includes('muted') && r.htmlMidias.includes('class="clip midia-arquivo"'));
  assert.ok(r.htmlMidias.includes('data-start="0.367"'));
  assert.ok(r.htmlMidias.includes('height: 1920px'), 'faixa 0: mídia de tela cheia');
  const livre = r.info.find((t) => t.id === 't02');
  assert.equal(livre.entradaPropria, true);
  const sons = planejarSons({ dados, eventosFaixa: [], telasInfo: r.info, zoomEv: [], cta: null, duracao: 10 });
  assert.ok(sons.some((s) => s.motivo === 'tela t02'));
  assert.ok(sons.some((s) => s.motivo === 'tela t03' && s.efeito === 'whoosh-medio'));
});

test('composição: vídeo da mídia nunca passa do fim do vídeo', () => {
  const telas = [{ id: 't03', tipo: 'midia', campos: { arquivo: 'midia/g.mp4', descricao: 'x' }, entra: 7, sai: 10 }];
  const r = montarTelas(cenasCom(telas), null, { midias: { t03: { src: 'assets/midia/g.mp4', tipo: 'video' } }, duracao: 10 });
  const inicio = 7 - 4 / 30;
  assert.ok(r.htmlMidias.includes(`data-duration="${Math.round((10 - inicio) * 1000) / 1000}"`));
});

test('molde do Reel: plugins e mídias têm lugar, e a mídia fica fora de #telas', () => {
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'reel', 'index.tpl.html'), 'utf8');
  const nomes = marcadoresDoMolde(molde);
  for (const chave of ['PLUGINS', 'MIDIAS', 'TELAS']) assert.ok(nomes.includes(chave), chave);
  const telas = molde.indexOf('id="telas"');
  const fimTelas = molde.indexOf('</div>', molde.indexOf('{{TELAS}}'));
  assert.ok(molde.indexOf('{{MIDIAS}}') > fimTelas && telas < fimTelas);
});

test('filtro da mídia: recorte, timelapse e 30 fps', () => {
  assert.equal(filtroDaMidia({ corte: { x: 0, y: 100, l: 1600, a: 900 }, velocidade: 40 }), "crop=1600:900:0:100,setpts=PTS/40,fps=30,scale='min(1920,iw)':-2:flags=lanczos,setsar=1,format=yuv420p");
  assert.equal(filtroDaMidia({}), "fps=30,scale='min(1920,iw)':-2:flags=lanczos,setsar=1,format=yuv420p");
});

test('mensagens novas existem e não têm marcador solto', () => {
  const msgs = JSON.parse(fs.readFileSync(path.join(KIT, 'mensagens.json'), 'utf8'));
  for (const codigo of ['MIDIA_FORMATO', 'MIDIA_FALHOU', 'MIDIA_FORA_DA_PASTA', 'MIDIA_CURTA', 'TELA_DEPOIS_DO_FIM']) {
    assert.ok(msgs[codigo] && msgs[codigo].texto && msgs[codigo].acao, codigo);
    assert.equal(JSON.stringify(msgs[codigo]).includes('{{}}'), false);
  }
});

// ---------- achados do revisor ----------

test('texto visível: código de caractere inválido não derruba; "<" solto é texto; tag em linha não separa', () => {
  assert.equal(textoVisivel('a &#99999999; b &#-1; c &#x110000;'), 'a b c');
  assert.equal(textoVisivel('Preço < 10 Spotify'), 'Preço < 10 Spotify');
  assert.equal(textoVisivel('<div>Sp<b>o</b>tify</div><p>fim</p>'), 'Spotify fim');
});

test('texto escrito por script e content do CSS contam; valor de estilo não', () => {
  assert.deepEqual(textosDeScript("tl.to(el, { text: 'Spotify', width: '100%' }); // WhatsApp\n /* Nubank */ var a = \"#fff\";"), ['Spotify', '#fff']);
  assert.deepEqual(textosDeContentCss('.a::after { content: "Resultado 100% garantido"; width: 100%; }'), ['Resultado 100% garantido']);
  const html = { nome: 'comp/index.html', conteudo: "<div>oi</div><script>tl.to(x, { text: 'Spotify' }, 1);</script>" };
  assert.equal(checarTextos([html], { cores: [], termos: ['Spotify'], coresDaMarca: [] }).length, 1);
  const js = { nome: 'comp/animacao.js', conteudo: "tl.to('#faixa', { clipPath: 'inset(0px)', width: '100%' })" };
  assert.deepEqual(checarTextos([js], { cores: [], termos: ['100%'], coresDaMarca: [] }), []);
});

test('fragmento: //cdn, Date() solto e animação própria sem registro reprovam; nome de função com Date passa', () => {
  assert.equal(conferirFragmento('<script src="//cdn.exemplo.com/x.js"></script>', 't02').length, 1);
  assert.equal(conferirFragmento('var agora = Date();', 't02').length, 1);
  assert.deepEqual(conferirFragmento('function updateDate() {} // comentário com //', 't02'), []);
  assert.equal(conferirFragmento('<div>sem script</div>', 't02', { entradaPropria: true }).length, 1);
  assert.deepEqual(conferirFragmento(FRAGMENTO_BOM, 't02', { entradaPropria: true }), []);
});

test('CSS da tela t1 não pode mexer na tela t10', () => {
  assert.deepEqual(seletoresVazados('#tela-t10 .x { color: red } #tela-t1 .y, #tela-t1:hover { top: 0 }', 't1'), ['#tela-t10 .x']);
});

test('arquivo da tela não pode ser atalho para fora do projeto; id da tela é seguro', () => {
  const pasta = projetoTemporario({});
  const fora = projetoTemporario({ 'segredo.html': '<div>x</div>' });
  fs.mkdirSync(path.join(pasta, 'telas-livres'), { recursive: true });
  fs.symlinkSync(path.join(fora, 'segredo.html'), path.join(pasta, 'telas-livres', 't02.html'));
  assert.equal(caminhoNoProjeto(pasta, 'telas-livres/t02.html'), null);
  const tela = { id: '../../x', tipo: 'card', campos: { texto: 'oi' }, entra: 5, sai: 7 };
  assert.ok(validarCenas(cenasCom([tela])).problemas.some((p) => p.problema.includes('"id" da tela')));
});

test('durações: tela depois do fim e gravação curta são achadas', () => {
  const telas = [{ id: 't01', entra: 2, sai: 6 }, { id: 't02', entra: 8, sai: 12 }];
  const r = conferirDuracoes(telas, 10, { t01: 2.5 });
  assert.deepEqual(r.depoisDoFim.map((x) => x.tela), ['t02']);
  assert.deepEqual(r.curtas.map((x) => x.tela), ['t01']);
  assert.deepEqual(conferirDuracoes(telas.slice(0, 1), 10, { t01: 4.2 }), { depoisDoFim: [], curtas: [] });
});

test('lista proibida: nome que só está na marca.json do aluno continua valendo com briefing', () => {
  const padrao = lerCatalogo('proibidos-padrao.json');
  const marca = { proibidos: { palavras: [], marcas: ['Rival Y', ...padrao.marcas], cores: [] } };
  const r = listasProibidas({ marca, padrao, briefing: { marcas_proibidas: [] }, appsReais: [] });
  assert.ok(r.termos.includes('Rival Y'));
});
