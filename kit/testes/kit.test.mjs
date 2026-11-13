import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planejarTrechos, grafoDaTrilha, grafoDaMixagem, grafoFinal, ganhoDaTrilha, pausasDaFala, distanciaAceita, inicioDaTrilha } from '../scripts/lib/mixer.mjs';
import { temFaststart, atomosDeTopo } from '../scripts/lib/mp4.mjs';
import { gerarMarca, lerCatalogo } from '../scripts/lib/marca.mjs';
import { validarCom, esquema } from '../scripts/lib/validar.mjs';
import { coresNoTexto, normalizarHex, distancia } from '../scripts/lib/cores.mjs';
import { montarComposicao } from '../scripts/lib/composicao.mjs';
import { analisarLegenda } from '../scripts/comandos/contar-legenda.mjs';
import { medirFala } from '../scripts/comandos/tempo-de-fala.mjs';
import { aplicar } from '../scripts/comandos/aplicar-correcoes.mjs';
import { alinharCenas } from '../scripts/comandos/alinhar.mjs';
import { conferirTrechos } from '../scripts/comandos/cortar.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(AQUI, '..');
const RAIZ = path.join(KIT, '..');
const ler = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));
const esquemaVariante = (nome) => ler(KIT, 'molde', 'variantes', `${nome}.json`);

// ---------- mixagem ----------

test('trechos da trilha: cai antes da virada e volta depois', () => {
  const t = planejarTrechos({ duracao: 10, viradas: [4], esquema: esquemaVariante('equilibrada') });
  assert.deepEqual(t, [
    [0, 3.7, 0, 'cheio'],
    [3.7, 4, 3.7, 'mudo'],
    [4, 10, 4, 'cheio'],
  ]);
});

test('trechos da trilha: "abafada" abafa 2 s antes da virada e respeita o início da trilha', () => {
  const t = planejarTrechos({ duracao: 10, viradas: [5], esquema: esquemaVariante('abafada'), inicioTrilha: 12 });
  const modos = t.map((x) => x[3]);
  assert.ok(modos.includes('abafado'));
  assert.equal(t[0][2], 12);
  for (let i = 1; i < t.length; i += 1) assert.equal(t[i][0], t[i - 1][1]);
});

test('grafo da trilha por comparação de texto', () => {
  const esquema = esquemaVariante('equilibrada');
  const trechos = [[0, 3.7, 0, 'cheio'], [3.7, 4, 3.7, 'mudo'], [4, 10, 4, 'cheio']];
  const esperado = [
    '[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=0:duration=3.7,asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=3.68:d=0.02,adelay=0:all=1[m0]',
    '[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=4:duration=6,asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=5.98:d=0.02,adelay=4000:all=1[m2]',
    '[m0][m2]amix=inputs=2:normalize=0,apad,atrim=duration=10,volume=-3dB,afade=t=out:st=6.5:d=3.5[mus]',
    '[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=10[chave]',
    '[mus][chave]sidechaincompress=threshold=0.15:ratio=2.5:attack=12:release=200[musd]',
  ].join(';');
  assert.equal(grafoDaTrilha({ trechos, duracao: 10, ganhoDb: -3, esquema }), esperado);
});

test('grafo da mixagem: base + trilha abafada pela voz; sem trilha vira só a base', () => {
  const esquema = esquemaVariante('equilibrada');
  const g = grafoDaMixagem({ trechos: [[0, 10, 0, 'cheio']], duracao: 10, ganhoDb: 0, esquema });
  assert.ok(g.endsWith('[base][musd]amix=inputs=2:normalize=0:duration=first[a]'));
  assert.equal(
    grafoDaMixagem({ trechos: [], duracao: 10, ganhoDb: 0, esquema, semMusica: true }),
    '[0:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=10[base];[base]anull[a]',
  );
  assert.equal(
    grafoFinal(1.5),
    '[1:a]volume=1.5dB,alimiter=limit=0.794:attack=5:release=80:level=disabled,aformat=sample_rates=48000:channel_layouts=stereo[a]',
  );
});

test('trilha só de silêncio quando tudo é mudo', () => {
  const g = grafoDaTrilha({ trechos: [[0, 5, 0, 'mudo']], duracao: 5, ganhoDb: 0, esquema: esquemaVariante('silencio') });
  assert.ok(g.startsWith('anullsrc=r=48000:cl=stereo,apad,atrim=duration=5'));
});

test('ganho, distância voz-trilha, pausas e início da trilha', () => {
  assert.equal(ganhoDaTrilha(-20, -30), -4);
  assert.equal(ganhoDaTrilha(-20, -60), 12);
  assert.equal(distanciaAceita(14), true);
  assert.equal(distanciaAceita(9), false);
  assert.deepEqual(pausasDaFala([{ inicio: 0, fim: 1 }, { inicio: 1.1, fim: 2 }, { inicio: 3, fim: 3.5 }]), [[2, 3]]);
  assert.equal(inicioDaTrilha(30, 40), 0);
  assert.equal(inicioDaTrilha(120, 40), 20);
});

// ---------- MP4 ----------

test('faststart: moov antes de mdat, inclusive com mdat de 64 bits', () => {
  const f = (n) => path.join(AQUI, 'fixtures', n);
  assert.equal(temFaststart(f('moov-antes.bin')), true);
  assert.equal(temFaststart(f('moov-depois.bin')), false);
  assert.equal(temFaststart(f('mdat-64bits-depois.bin')), false);
  assert.deepEqual(atomosDeTopo(f('moov-antes.bin')).map((a) => a.tipo), ['ftyp', 'moov', 'mdat']);
});

// ---------- marca e esquemas ----------

test('marca.json gerada a partir do briefing de exemplo é igual à guardada', () => {
  const briefing = ler(KIT, 'marca-exemplo', 'briefing.json');
  const guardada = ler(KIT, 'marca-exemplo', 'marca.json');
  const { marca } = gerarMarca(briefing, {
    paletas: lerCatalogo('paletas.json'),
    pares: lerCatalogo('pares-de-fonte.json'),
    proibidosPadrao: lerCatalogo('proibidos-padrao.json'),
  });
  assert.deepEqual(marca, guardada);
  assert.deepEqual(validarCom('marca', marca), []);
  assert.deepEqual(validarCom('briefing', briefing), []);
});

test('todo exemplo de esquema é válido', () => {
  const pasta = path.join(KIT, 'esquemas', 'exemplos');
  for (const arquivo of fs.readdirSync(pasta)) {
    if (!arquivo.endsWith('.json')) continue;
    const nome = arquivo.slice(0, -'.json'.length);
    assert.deepEqual(validarCom(nome, ler(pasta, arquivo)), [], arquivo);
  }
});

test('o esquema reprova cor escrita errado', () => {
  const marca = ler(KIT, 'marca-exemplo', 'marca.json');
  const erros = validarCom('marca', { ...marca, cores: { ...marca.cores, principal: 'azul' } });
  assert.ok(erros.length > 0);
});

test('o briefing em branco do assistente bate com o esquema', (t) => {
  const arquivo = path.join(RAIZ, 'briefing', 'briefing-em-branco.json');
  if (!fs.existsSync(arquivo)) {
    t.skip('briefing/briefing-em-branco.json ainda não existe');
    return;
  }
  assert.deepEqual(validarCom('briefing', ler(arquivo)), []);
  assert.ok(esquema('briefing'));
});

// ---------- cores ----------

test('cores no texto: hex, rgb, hsl; ignora âncora e id', () => {
  const css = '.a{color:#FFF;background:rgb(255, 0, 0)} .b{fill:hsl(120, 100%, 50%)} a[href="#topo"] #cabecalho{}';
  const cores = coresNoTexto(css).sort();
  assert.deepEqual(cores, ['#00ff00', '#ff0000', '#ffffff']);
  assert.equal(normalizarHex('#abc'), '#aabbcc');
  assert.equal(distancia('#000000', '#000000'), 0);
});

// ---------- texto do post e roteiro ----------

test('contar-legenda: primeira linha, hashtags, link e palavra do pedido', () => {
  const bom = analisarLegenda('Quantas fatias pedir para 30 pessoas?\n\nComenta FATIAS que eu te mando.\n#bolo #festa', 'FATIAS');
  assert.deepEqual(bom.problemas, []);
  assert.equal(bom.hashtags, 2);
  const ruim = analisarLegenda(`${'a'.repeat(130)}\nveja www.exemplo.com #a #b #c #d #e #f`, 'FATIAS');
  const codigos = ruim.problemas.map((p) => p.codigo);
  assert.deepEqual(codigos, ['PRIMEIRA_LINHA_LONGA', 'HASHTAGS_DEMAIS', 'LINK_NA_LEGENDA', 'PALAVRA_DO_PEDIDO_FALTA']);
});

test('tempo de fala conta só as linhas que começam com "> "', () => {
  const roteiro = '# Roteiro\n> O bolo chegou e não deu.\nnota da direção\n> Comenta FATIAS.\n';
  const r = medirFala(roteiro);
  assert.equal(r.blocos.length, 2);
  assert.equal(r.palavras, 8);
});

// ---------- correções, alinhamento, corte ----------

const transcricao = () => ({
  idioma: 'pt',
  modelo: 'small',
  duracao_s: 4,
  palavras: [
    { texto: 'O', inicio: 0.1, fim: 0.2 },
    { texto: 'bolo', inicio: 0.2, fim: 0.5 },
    { texto: 'chegou.', inicio: 0.5, fim: 0.9 },
    { texto: 'Comenta', inicio: 2.0, fim: 2.4 },
    { texto: 'fatia.', inicio: 2.4, fim: 2.9 },
  ],
  segmentos: [{ texto: 'O bolo chegou. Comenta fatia.', inicio: 0.1, fim: 2.9 }],
});

test('correções trocam a palavra certa e mantêm a pontuação', () => {
  const r = aplicar(transcricao(), [{ inicio: 2.4, de: 'fatia', para: 'FATIAS' }, { inicio: 3.5, de: 'nada', para: 'x' }]);
  assert.equal(r.aplicadas, 1);
  assert.equal(r.transcricao.palavras[4].texto, 'FATIAS.');
  assert.equal(r.avisos[0].codigo, 'CORRECAO_NAO_CASOU');
  const removida = aplicar(transcricao(), [{ inicio: 0.1, de: 'O', para: '' }]);
  assert.equal(removida.transcricao.palavras.length, 4);
});

test('alinhar acerta início e fim das cenas pela fala, sem buraco', () => {
  const dados = {
    versao: 1,
    titulo_gancho: { texto: 'Seu bolo chega menor?' },
    cenas: [
      { id: 'c01', fala: 'O bolo chegou.', inicio: 0, fim: 1.5, faixa: 0, enfase: [{ palavra: 'bolo' }], sons: [] },
      { id: 'c02', fala: 'Comenta FATIAS.', inicio: 1.5, fim: 3, faixa: 0, enfase: [], sons: [{ efeito: 'pop', em: 2, volume: 0.8 }] },
    ],
    telas: [],
    cta: { palavra: 'FATIAS' },
  };
  const t = aplicar(transcricao(), [{ inicio: 2.4, de: 'fatia', para: 'FATIAS' }]).transcricao;
  const { cenas, avisos } = alinharCenas(dados, t, 4);
  assert.deepEqual(avisos, []);
  assert.equal(cenas.cenas[0].inicio, 0);
  assert.equal(cenas.cenas[0].fim, cenas.cenas[1].inicio);
  assert.equal(cenas.cenas[1].inicio, 2);
  assert.equal(cenas.cenas[1].fim, 4);
  assert.equal(cenas.cenas[0].enfase[0].inicio, 0.2);
  assert.equal(cenas.cenas[1].sons[0].em, 2.5);
  assert.equal(cenas.cta.em, 2.4);
});

test('trechos de corte fora do vídeo ou invertidos reprovam', () => {
  assert.deepEqual(conferirTrechos({ trechos: [{ inicio: 1, fim: 5 }] }, 10), []);
  assert.equal(conferirTrechos({ trechos: [{ inicio: 5, fim: 1 }] }, 10).length, 1);
  assert.equal(conferirTrechos({ trechos: [{ inicio: 1, fim: 12 }] }, 10).length, 1);
  assert.equal(conferirTrechos({ trechos: [] }, 10).length, 1);
});

// ---------- composição ----------

test('composição de exemplo monta faixas, legendas, telas e sons', () => {
  const dados = ler(KIT, 'esquemas', 'exemplos', 'cenas.json');
  const marca = ler(KIT, 'marca-exemplo', 'marca.json');
  const transc = {
    palavras: [
      { texto: 'O', inicio: 0.1, fim: 0.2 }, { texto: 'bolo', inicio: 0.2, fim: 0.5 }, { texto: 'chegou', inicio: 0.5, fim: 0.9 },
      { texto: 'A', inicio: 2.7, fim: 2.8 }, { texto: 'conta', inicio: 2.8, fim: 3.2 }, { texto: 'certa.', inicio: 3.2, fim: 3.6 },
      { texto: 'Comenta', inicio: 5.5, fim: 5.9 }, { texto: 'FATIAS', inicio: 6.0, fim: 6.5 },
    ],
  };
  const r = montarComposicao({ dados, transcricao: transc, marca, duracao: 8.6 });
  assert.equal(r.dadosReel.duracao, 8.6);
  assert.ok(r.dadosReel.faixas.length >= 2);
  assert.ok(r.dadosReel.legendas.length >= 1);
  assert.equal(r.dadosReel.telas.length, 1);
  assert.ok(Array.isArray(r.sons));
  const explicitos = r.sons.filter((s) => s.efeito === 'pop' && Math.abs(s.inicio - 6) < 0.15);
  assert.equal(explicitos.length, 1, 'som explícito não pode ser duplicado pelo automático');
  assert.ok(r.sons.every((s) => s.arquivo.startsWith('assets/sfx/') && s.volume <= 3.98));
});
