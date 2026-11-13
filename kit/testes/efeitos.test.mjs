// Efeitos de cena, recorte da pessoa, série numerada e tela checklist (Issue #15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCenas } from '../scripts/lib/cenas.mjs';
import { catalogo, problemasDaFicha, arquivosDoEfeito, PASTA_EFEITOS } from '../scripts/lib/efeitos.mjs';
import vm from 'node:vm';
import os from 'node:os';
import { pessoaNoAlfa, AMOSTRA_ALFA, PESSOA_PADRAO, trechosDoRecorte, noQuadro, lerManifesto, MANIFESTO } from '../scripts/lib/recorte.mjs';
import { montarEfeitos, montarSerie, planejarSons, eventosDeFaixa } from '../scripts/lib/composicao.mjs';
import { fichaDoEfeito } from '../scripts/lib/efeitos.mjs';
import { preencher } from '../scripts/lib/texto.mjs';
import { htmlDaTela } from '../scripts/lib/telas.mjs';
import { EFEITOS } from '../scripts/lib/cenas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const exemplo = () => JSON.parse(fs.readFileSync(path.join(AQUI, '..', 'esquemas', 'exemplos', 'cenas.json'), 'utf8'));
const problemasDe = (dados) => validarCenas(dados).problemas.map((p) => p.problema).join(' | ');
const avisosDe = (dados) => validarCenas(dados).avisos.map((a) => a.codigo);
const revista = (extra = {}) => ({ nome: 'revista', porque: 'anuncia o resultado como manchete de capa', ...extra });

// Vídeo de 20 s, quatro cenas de rosto cheio, sem telas: cabe até 4 efeitos.
function longo() {
  const d = exemplo();
  d.telas = [];
  d.cenas = [
    { id: 'c01', fala: 'Gancho do vídeo.', inicio: 0, fim: 2.6, faixa: 0 },
    { id: 'c02', fala: 'Segunda parte da fala.', inicio: 2.6, fim: 6, faixa: 0 },
    { id: 'c03', fala: 'Terceira parte da fala.', inicio: 6, fim: 10, faixa: 0 },
    { id: 'c04', fala: 'Quarta parte da fala.', inicio: 10, fim: 14, faixa: 0 },
    { id: 'c05', fala: 'Quinta parte da fala.', inicio: 14, fim: 20, faixa: 0 },
  ];
  return d;
}

test('toda ficha de efeito é válida e tem a animação', () => {
  const arquivos = fs.readdirSync(PASTA_EFEITOS).filter((n) => n.endsWith('.json'));
  assert.ok(arquivos.length >= 1);
  for (const arquivo of arquivos) {
    const ficha = JSON.parse(fs.readFileSync(path.join(PASTA_EFEITOS, arquivo), 'utf8'));
    assert.deepEqual(problemasDaFicha(ficha, arquivo), [], arquivo);
    assert.ok(arquivosDoEfeito(ficha.nome).js, `${ficha.nome} sem .js`);
    for (const som of ficha.sons || []) assert.ok(EFEITOS.includes(som.efeito), `${ficha.nome}: som ${som.efeito} não existe no kit`);
  }
});

// Seletores de regra de um CSS, inclusive os de dentro de @media/@supports; os quadros de @keyframes
// voltam como { quadro: true }. Conta chaves em vez de cortar por "}", que esconderia blocos aninhados.
function seletoresDoCss(texto) {
  let semComentario = '';
  for (const pedaco of texto.split('/*')) semComentario += pedaco.includes('*/') ? pedaco.slice(pedaco.indexOf('*/') + 2) : pedaco;
  const saida = [];
  const pilha = [];
  let cabeca = '';
  for (const ch of semComentario) {
    if (ch === '{') {
      const c = cabeca.trim();
      const dentroDeQuadros = pilha.length && pilha[pilha.length - 1].startsWith('@') && pilha[pilha.length - 1].includes('keyframes');
      if (!c.startsWith('@')) for (const parte of c.split(',')) saida.push(dentroDeQuadros ? { quadro: true, texto: parte.trim() } : parte.trim());
      pilha.push(c);
      cabeca = '';
    } else if (ch === '}') {
      pilha.pop();
      cabeca = '';
    } else if (ch === ';') cabeca = '';
    else cabeca += ch;
  }
  return saida;
}

// O seletor começa pela classe do efeito como palavra inteira e não usa irmão (~ ou +), que alcança
// elementos fora da camada do efeito.
function dentroDoEfeito(seletor, nome) {
  if (typeof seletor === 'object') return true;
  const raiz = `.ef-${nome}`;
  if (!seletor.startsWith(raiz)) return false;
  const depois = seletor.slice(raiz.length);
  if (depois && ![' ', '.', ':', '[', '>'].includes(depois[0])) return false;
  return !seletor.includes('~') && !seletor.includes('+');
}

test('o conferente de escopo de CSS pega bloco aninhado, prefixo parecido e irmão', () => {
  const ruim = '@media (min-width:1px){ body{display:none} } .ef-x2 a{} .ef-x ~ #take{} @keyframes k { from{} 50%{} }';
  const seletores = seletoresDoCss(ruim);
  const fora = seletores.filter((s) => !dentroDoEfeito(s, 'x')).map((s) => s);
  assert.deepEqual(fora, ['body', '.ef-x2 a', '.ef-x ~ #take']);
  assert.ok(dentroDoEfeito('.ef-x .a:hover', 'x') && dentroDoEfeito('.ef-x', 'x'));
});

test('animação de efeito é determinística: sem callback, acaso, relógio ou rede', () => {
  const proibidos = ['onUpdate', 'onComplete', 'onStart', 'onRepeat', 'onReverseComplete', '.call(', 'delayedCall', 'gsap.ticker', 'utils.random', 'Math.random', 'Date.now', 'new Date', 'performance.now', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'repeat: -1', 'http://', 'https://', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'import('];
  for (const nome of Object.keys(catalogo())) {
    const { js, css } = arquivosDoEfeito(nome);
    // o endereço do padrão SVG (xmlns) não é rede
    const texto = (fs.readFileSync(js, 'utf8') + (css ? fs.readFileSync(css, 'utf8') : '')).split('http://www.w3.org/').join('');
    for (const p of proibidos) assert.ok(!texto.includes(p), `${nome} usa ${p}`);
    if (css) for (const seletor of seletoresDoCss(fs.readFileSync(css, 'utf8'))) assert.ok(dentroDoEfeito(seletor, nome), `${nome}.css: seletor fora de .ef-${nome}: ${seletor}`);
  }
});

test('efeito válido passa; sem "porque", desconhecido ou campo errado reprova', () => {
  const d = longo();
  d.cenas[2].efeito = revista({ chamadas: ['Reel sem editar'] });
  assert.deepEqual(validarCenas(d).problemas, []);
  const sem = longo();
  sem.cenas[2].efeito = { nome: 'revista', porque: 'capa' };
  assert.ok(problemasDe(sem).includes('porque'));
  const x = longo();
  x.cenas[2].efeito = { nome: 'nao-existe', porque: 'uma frase com palavras suficientes' };
  assert.ok(problemasDe(x).includes('efeito desconhecido'));
  const c = longo();
  c.cenas[2].efeito = revista({ cor: 'azul', selo: 'três palavras aqui' });
  const t = problemasDe(c);
  assert.ok(t.includes('não tem o campo "cor"'));
  assert.ok(t.includes('"selo" tem 3 palavras'));
});

test('efeito só com rosto cheio, depois do gancho, sem repetir e dentro do limite', () => {
  const faixa = longo();
  faixa.cenas[2].faixa = 50;
  faixa.cenas[2].efeito = revista();
  assert.ok(problemasDe(faixa).includes('rosto cheio'));
  const gancho = longo();
  gancho.cenas[0].efeito = revista();
  assert.ok(problemasDe(gancho).includes('depois do gancho'));
  const repete = longo();
  repete.cenas[2].efeito = revista();
  repete.cenas[3].efeito = revista();
  assert.ok(problemasDe(repete).includes('repete'));
  // vídeo de 9 s: cabe 1 efeito (1 a cada 5 s); dois reprovam
  const demais = longo();
  demais.cenas = [
    { id: 'c01', fala: 'Gancho do vídeo.', inicio: 0, fim: 2.6, faixa: 0 },
    { id: 'c02', fala: 'Segunda parte.', inicio: 2.6, fim: 4.6, faixa: 0, efeito: revista() },
    { id: 'c03', fala: 'Terceira parte.', inicio: 4.6, fim: 6.6, faixa: 0 },
    { id: 'c04', fala: 'Quarta parte.', inicio: 6.6, fim: 9, faixa: 0, efeito: revista() },
  ];
  assert.ok(problemasDe(demais).includes('efeitos de cena; o máximo'));
});

test('cena curta ou longa demais para o efeito reprova', () => {
  const d = longo();
  d.cenas[4].efeito = revista();
  assert.ok(problemasDe(d).includes('pede uma cena de'));
});

test('efeito que encolhe o rosto ou disputa com tela gera aviso, não reprova', () => {
  const ficha = Object.values(catalogo()).find((f) => f.rosto_pequeno);
  assert.ok(ficha, 'o kit tem efeito que encolhe o rosto');
  {
    const d = longo();
    const campos = {};
    for (const [nome, campo] of Object.entries(ficha.campos || {})) {
      if (!campo.obrigatorio) continue;
      if (campo.tipo === 'texto') campos[nome] = 'texto curto';
      if (campo.tipo === 'lista') campos[nome] = Array.from({ length: campo.itens[0] }, () => (campo.opcoes ? campo.opcoes[0] : 'item'));
      if (campo.tipo === 'numero') campos[nome] = campo.min;
      if (campo.tipo === 'escolha') campos[nome] = campo.opcoes[0];
    }
    d.cenas[2].fim = 6 + Math.min(ficha.duracao.max, 4);
    d.cenas[3].inicio = d.cenas[2].fim;
    d.cenas[2].efeito = { nome: ficha.nome, porque: 'o aluno pediu este efeito aqui', ...campos };
    assert.deepEqual(validarCenas(d).problemas, []);
    assert.ok(avisosDe(d).includes('ROSTO_PEQUENO'));
  }
  const t = longo();
  t.cenas[2].efeito = revista();
  t.telas = [{ id: 't1', tipo: 'card', campos: { texto: 'Oi' }, entra: 7, sai: 8.5 }];
  assert.ok(avisosDe(t).includes('EFEITO_COM_TELA'));
});

test('recorte: só as cenas que pedem, no quadro, e --cenas acrescenta', () => {
  const d = longo();
  d.cenas[2].efeito = revista();
  d.cenas[2].inicio = 6.01;
  assert.deepEqual(trechosDoRecorte(d.cenas).map((t) => t.id), ['c03']);
  assert.equal(trechosDoRecorte(d.cenas)[0].inicio, noQuadro(6.01));
  assert.deepEqual(trechosDoRecorte(d.cenas, ['c05']).map((t) => t.id), ['c03', 'c05']);
});

test('recorte: mede o topo e as laterais da cabeça no canal de transparência', () => {
  const { largura, altura } = AMOSTRA_ALFA;
  const alfa = Buffer.alloc(largura * altura, 0);
  for (let y = 80; y < altura; y += 1) for (let x = 35; x < 75; x += 1) alfa[y * largura + x] = 255;
  assert.deepEqual(pessoaNoAlfa(alfa), { topo: 800, esquerda: 350, direita: 750 });
  // quadro sem ninguém não vira medida falsa
  assert.equal(pessoaNoAlfa(Buffer.alloc(largura * altura, 0)), null);
});

test('montar efeitos: três camadas por efeito, recorte só quando pronto', () => {
  const d = longo();
  d.cenas[2].efeito = revista({ titulo: 'Rodrigo' });
  const sem = montarEfeitos(d, {});
  assert.ok(sem.htmlFundo.includes('ef-c03-fundo') && sem.htmlAtras.includes('ef-c03-atras') && sem.htmlFrente.includes('ef-c03-frente'));
  assert.equal(sem.htmlRecortes, '');
  assert.equal(sem.info[0].recorte, null);
  const com = montarEfeitos(d, { recortes: { c03: { pessoa: { topo: 700, esquerda: 300, direita: 800 } } } });
  assert.ok(com.htmlRecortes.includes('assets/recorte/c03.webm'));
  assert.equal(com.info[0].recorte, '#rec-c03');
  assert.equal(com.info[0].pessoa.topo, 700);
  assert.equal(com.info[0].p.titulo, 'Rodrigo');
});

test('sons do efeito entram pela ficha', () => {
  const d = longo();
  d.cenas[2].efeito = revista();
  const ef = montarEfeitos(d, {});
  const sons = planejarSons({ dados: d, eventosFaixa: [], telasInfo: [], zoomEv: [], cta: null, duracao: 20, efeitosInfo: ef.info });
  assert.ok(sons.some((s) => s.motivo.includes('efeito revista')));
});

test('série: itens em ordem e dentro do vídeo; monta número, nome e segmentos', () => {
  const d = longo();
  d.serie = { titulo: 'Três passos', itens: [{ nome: 'Instale', em: 3 }, { nome: 'Grave', em: 8 }] };
  assert.deepEqual(validarCenas(d).problemas, []);
  const s = montarSerie(d, 20);
  assert.ok(s.html.includes('serie-n1') && s.html.includes('Grave') && s.html.includes('serie-s1'));
  assert.equal(s.dados.total, 2);
  const fora = longo();
  fora.serie = { itens: [{ nome: 'Um', em: 8 }, { nome: 'Dois', em: 3 }] };
  assert.ok(problemasDe(fora).includes('ordem de tempo'));
  const curta = longo();
  curta.serie = { itens: [{ nome: 'Só um', em: 3 }] };
  assert.ok(problemasDe(curta).includes('a série precisa de'));
});

test('tela checklist: 2 a 20 itens, contador e marcas', () => {
  const d = longo();
  d.cenas[3].faixa = 50;
  d.cenas[3].tela = 't1';
  d.telas = [{ id: 't1', tipo: 'checklist', campos: { titulo: 'Tudo pronto', itens: ['Instalar', 'Gravar', 'Postar'] }, entra: 10.2, sai: 13.8 }];
  assert.deepEqual(validarCenas(d).problemas, []);
  const html = htmlDaTela(d.telas[0], { tamanho: 'm' });
  assert.ok(html.includes('t1-v2') && html.includes('/ 3') && html.includes('t1-n2'));
  d.telas[0].campos.itens = ['Só um'];
  assert.ok(problemasDe(d).includes('checklist precisa de'));
});

test('posição da pessoa: a da cena, senão a medida mais perto no tempo, senão a típica', async () => {
  const { pessoaDaCena, cenasSoParaMedir } = await import('../scripts/lib/recorte.mjs');
  const medidas = [{ id: 'c02', t: 3, pessoa: { topo: 800, esquerda: 300, direita: 760 } }, { id: 'c05', t: 14, pessoa: { topo: 900, esquerda: 320, direita: 780 } }];
  assert.equal(pessoaDaCena('c05', 14, medidas).topo, 900);
  assert.equal(pessoaDaCena('c03', 6, medidas).topo, 800);
  assert.equal(pessoaDaCena('c04', 12, medidas).topo, 900);
  assert.deepEqual(pessoaDaCena('c04', 12, []), { ...PESSOA_PADRAO, medida: false });
  // medida emprestada de outra cena é palpite: o montar avisa EFEITO_SEM_MEDIDA
  assert.equal(pessoaDaCena('c03', 6, medidas).medida, false);
  assert.equal(pessoaDaCena('c05', 14, medidas).medida, true);
  const d = longo();
  d.cenas[2].efeito = revista();
  d.cenas[3].efeito = { nome: 'qualquer', porque: 'x' };
  assert.deepEqual(cenasSoParaMedir(d.cenas, trechosDoRecorte(d.cenas)).map((c) => c.id), ['c04']);
});

test('trilha da pessoa: uma medida a cada 15 quadros, a primeira vira a principal', async () => {
  const { pessoaComTrilha } = await import('../scripts/lib/recorte.mjs');
  const { largura, altura } = AMOSTRA_ALFA;
  const quadro = (topo) => {
    const a = Buffer.alloc(largura * altura, 0);
    for (let y = topo; y < altura; y += 1) for (let x = 40; x < 70; x += 1) a[y * largura + x] = 255;
    return a;
  };
  const p = pessoaComTrilha(Buffer.concat([quadro(70), quadro(85)]), 30);
  assert.equal(p.topo, 700);
  assert.deepEqual(p.trilha.map((x) => [x.t, x.topo]), [[0, 700], [0.5, 850]]);
  assert.equal(p.medida, true);
  assert.deepEqual(pessoaComTrilha(Buffer.alloc(0), 30).trilha, []);
  // só quadros vazios: lugar típico, marcado como não medido
  const vazio = pessoaComTrilha(Buffer.alloc(largura * altura * 2, 0), 30);
  assert.equal(vazio.medida, false);
  assert.equal(vazio.topo, PESSOA_PADRAO.topo);
  // quadro vazio no meio fica fora da trilha
  const meio = pessoaComTrilha(Buffer.concat([quadro(70), Buffer.alloc(largura * altura, 0), quadro(90)]), 30);
  assert.deepEqual(meio.trilha.map((x) => x.t), [0, 1]);
});

test('id de cena: só letras sem acento, números, - e _; sem repetir', () => {
  for (const id of ['c 3', "c'3", '../c3', '']) {
    const d = longo();
    d.cenas[2].id = id;
    assert.ok(problemasDe(d).includes('"id" da cena'), `id ${JSON.stringify(id)} passou`);
  }
  const d = longo();
  d.cenas[3].id = 'c03';
  assert.ok(problemasDe(d).includes('id de cena repetido'));
});

test('nome de efeito que existe no Object.prototype é desconhecido, não derruba o validador', () => {
  assert.equal(fichaDoEfeito('constructor'), null);
  assert.equal(fichaDoEfeito('__proto__'), null);
  const d = longo();
  d.cenas[2].efeito = { nome: 'constructor', porque: 'nome estranho vindo do arquivo' };
  assert.ok(problemasDe(d).includes('efeito desconhecido'));
});

test('série não começa no gancho; efeito que leva à cena seguinte não vai na última', () => {
  const d = longo();
  d.serie = { itens: [{ nome: 'Um', em: 1 }, { nome: 'Dois', em: 8 }] };
  assert.ok(problemasDe(d).includes('a série começa depois do gancho'));
  const fim = longo();
  fim.cenas[4].fim = 16;
  fim.cenas[4].efeito = { nome: 'atravessar', porque: 'fecha a ideia e pula para a próxima' };
  assert.ok(problemasDe(fim).includes('na última cena'));
});

test('efeito que bate na ênfase avisa quando a cena não tem ênfase', () => {
  const nome = Object.values(catalogo()).find((f) => (f.sons || []).some((s) => s.em === 'golpe') && !Object.values(f.campos || {}).some((c) => c.obrigatorio)).nome;
  const d = longo();
  d.cenas[2].fim = 6 + Math.min(fichaDoEfeito(nome).duracao.max, 3);
  d.cenas[3].inicio = d.cenas[2].fim;
  d.cenas[2].efeito = { nome, porque: 'marca a virada da fala aqui' };
  assert.ok(avisosDe(d).includes('EFEITO_SEM_ENFASE'));
  d.cenas[2].enfase = [{ palavra: 'parte' }];
  assert.ok(!avisosDe(d).includes('EFEITO_SEM_ENFASE'));
});

test('efeito que usa c.golpe tem som em "golpe" (a regra de aviso depende disso)', () => {
  for (const ficha of Object.values(catalogo())) {
    const usa = fs.readFileSync(arquivosDoEfeito(ficha.nome).js, 'utf8').includes('c.golpe');
    const somNoGolpe = (ficha.sons || []).some((s) => s.em === 'golpe');
    assert.equal(usa, somNoGolpe, `${ficha.nome}: c.golpe no .js e som em "golpe" na ficha andam juntos`);
  }
});

test('cena com efeito entra em corte seco de faixa (o efeito é dono do #cam)', () => {
  const d = longo();
  d.cenas[1].faixa = 50;
  d.cenas[2].efeito = revista();
  const ev = eventosDeFaixa(d.cenas, null, undefined);
  const entrada = ev.find((e) => e.t === 6);
  assert.equal(entrada.d, 0);
  const semEfeito = eventosDeFaixa(longo().cenas.map((c, i) => (i === 1 ? { ...c, faixa: 50 } : c)), null, undefined);
  assert.ok(semEfeito.find((e) => e.t === 6).d > 0);
});

test('preencher troca o molde numa passagem só: texto do aluno com {{CHAVE}} fica como texto', () => {
  const molde = '<a>{{DADOS}}</a><b>{{TELAS}}</b>{{SOLTO';
  assert.equal(preencher(molde, { DADOS: '{"t":"{{TELAS}}"}', TELAS: '<i></i>' }), '<a>{"t":"{{TELAS}}"}</a><b><i></i></b>{{SOLTO');
});

test('manifesto do recorte: ausente vira vazio; quebrado reprova em vez de apagar medidas', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'manifesto-'));
  try {
    assert.equal(lerManifesto(pasta).take, '');
    fs.writeFileSync(path.join(pasta, MANIFESTO), '{"take": "x", "tre');
    assert.throws(() => lerManifesto(pasta), (e) => e.codigo === 'ARQUIVO_INVALIDO');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('gráfico: o número na tela arredonda antes de separar a casa decimal', () => {
  const caixa = { window: {}, document: { createElement: () => ({}) } };
  vm.runInNewContext(fs.readFileSync(arquivosDoEfeito('grafico').js, 'utf8'), caixa);
  const formata = caixa.window.__efeito.grafico.formata;
  assert.equal(formata(2.99, 1), '3,0');
  assert.equal(formata(1.96, 1), '2,0');
  assert.equal(formata(1250, 0), '1.250');
  assert.equal(formata(-0.04, 1), '0,0');
  assert.equal(formata(-12.34, 1), '-12,3');
});

test('texto do aluno escapa aspas também (vai para atributo, como src da imagem)', () => {
  for (const nome of Object.keys(catalogo())) {
    const js = fs.readFileSync(arquivosDoEfeito(nome).js, 'utf8');
    if (!js.includes('var esc =')) continue;
    assert.ok(js.includes(`split('"').join('&quot;')`), `${nome}: esc sem aspas`);
  }
});
