// Efeitos de cena, recorte da pessoa, série numerada e tela checklist (Issue #15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCenas } from '../scripts/lib/cenas.mjs';
import { catalogo, problemasDaFicha, arquivosDoEfeito, PASTA_EFEITOS } from '../scripts/lib/efeitos.mjs';
import { pessoaNoAlfa, AMOSTRA_ALFA, PESSOA_PADRAO, trechosDoRecorte, noQuadro } from '../scripts/lib/recorte.mjs';
import { montarEfeitos, montarSerie, planejarSons } from '../scripts/lib/composicao.mjs';
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

test('animação de efeito é determinística: sem callback, acaso, relógio ou rede', () => {
  const proibidos = ['onUpdate', 'onComplete', 'onStart', '.call(', 'Math.random', 'Date.now', 'new Date', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'repeat: -1', 'http://', 'https://', 'fetch('];
  for (const nome of Object.keys(catalogo())) {
    const { js, css } = arquivosDoEfeito(nome);
    // o endereço do padrão SVG (xmlns) não é rede
    const texto = (fs.readFileSync(js, 'utf8') + (css ? fs.readFileSync(css, 'utf8') : '')).split('http://www.w3.org/').join('');
    for (const p of proibidos) assert.ok(!texto.includes(p), `${nome} usa ${p}`);
    if (css) {
      const seletores = fs.readFileSync(css, 'utf8').split('}').map((b) => b.split('{')[0].trim()).filter((s) => s && !s.startsWith('/*') && !s.startsWith('@'));
      for (const s of seletores) {
        const limpo = s.split('*/').pop().trim();
        for (const parte of limpo.split(',').map((x) => x.trim())) {
          const quadroChave = parte === 'from' || parte === 'to' || (parte.endsWith('%') && Number.isFinite(Number(parte.slice(0, -1))));
          assert.ok(parte.startsWith(`.ef-${nome}`) || quadroChave, `${nome}.css: seletor fora de .ef-${nome}: ${parte}`);
        }
      }
    }
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
  if (ficha) {
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
  assert.deepEqual(pessoaNoAlfa(Buffer.alloc(largura * altura, 0)), { ...PESSOA_PADRAO });
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
  assert.equal(pessoaDaCena('c03', 6, medidas).medida, true);
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
  assert.deepEqual(pessoaComTrilha(Buffer.alloc(0), 30).trilha, []);
});
