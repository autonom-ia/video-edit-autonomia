// Conferências do próprio código do kit: códigos de mensagem existentes,
// nada de expressão regular e nenhum dado pessoal de quem criou o estúdio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(AQUI, '..');
const RAIZ = path.join(KIT, '..');
const ESTE = fileURLToPath(import.meta.url);

function arquivos(pasta, fim) {
  const lista = [];
  if (!fs.existsSync(pasta)) return lista;
  for (const nome of fs.readdirSync(pasta)) {
    const c = path.join(pasta, nome);
    if (fs.statSync(c).isDirectory()) lista.push(...arquivos(c, fim));
    else if (fim.some((f) => nome.endsWith(f))) lista.push(c);
  }
  return lista;
}

const ehCodigo = (s) => s.length >= 3 && [...s].every((ch) => (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_');

// Lê o texto entre aspas simples que começa logo depois de "prefixo".
function literaisDepois(texto, prefixo) {
  const achados = [];
  let i = texto.indexOf(prefixo);
  while (i !== -1) {
    const ini = i + prefixo.length;
    const fim = texto.indexOf("'", ini);
    if (fim !== -1) achados.push(texto.slice(ini, fim));
    i = texto.indexOf(prefixo, ini);
  }
  return achados;
}

// Todos os literais 'MAIUSCULOS' de uma linha.
function literaisDaLinha(linha) {
  const partes = linha.split("'");
  const saida = [];
  for (let k = 1; k < partes.length; k += 2) saida.push(partes[k]);
  return saida;
}

function codigosUsados() {
  const usados = new Map();
  const anotar = (codigo, arquivo) => {
    if (!ehCodigo(codigo)) return;
    if (!usados.has(codigo)) usados.set(codigo, path.relative(KIT, arquivo));
  };
  for (const arquivo of arquivos(path.join(KIT, 'scripts'), ['.mjs'])) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const prefixo of ["falha('", "reprovado('", "aviso('", "codigo: '", "codigo = '", "KitErro('"]) {
      for (const c of literaisDepois(texto, prefixo)) anotar(c, arquivo);
    }
    for (const linha of texto.split('\n')) {
      if (linha.includes('exigirArquivo(') || linha.includes('ffmpegOk(') || linha.includes("? '")) {
        for (const c of literaisDaLinha(linha)) if (c.includes('_')) anotar(c, arquivo);
      }
    }
  }
  return usados;
}

test('todo código de erro ou aviso usado no kit existe em kit/mensagens.json', () => {
  const mensagens = JSON.parse(fs.readFileSync(path.join(KIT, 'mensagens.json'), 'utf8'));
  const faltando = [];
  for (const [codigo, onde] of codigosUsados()) if (!mensagens[codigo]) faltando.push(`${codigo} (${onde})`);
  assert.deepEqual(faltando, []);
});

test('toda mensagem do kit tem texto e ação em frases curtas', () => {
  const mensagens = JSON.parse(fs.readFileSync(path.join(KIT, 'mensagens.json'), 'utf8'));
  for (const [codigo, m] of Object.entries(mensagens)) {
    if (codigo.startsWith('_')) continue;
    assert.ok(typeof m.texto === 'string' && m.texto.trim(), `${codigo} sem texto`);
    assert.ok(typeof m.acao === 'string' && m.acao.trim(), `${codigo} sem ação`);
    assert.ok(!m.texto.includes(PESSOAIS[0]), `${codigo} com caminho pessoal`);
  }
});

test('códigos do kit não colidem com os do instalador (exceto DESCONHECIDO)', (t) => {
  const arquivo = path.join(RAIZ, 'instalar', 'mensagens.json');
  if (!fs.existsSync(arquivo)) {
    t.skip('instalar/mensagens.json ainda não existe');
    return;
  }
  const kit = JSON.parse(fs.readFileSync(path.join(KIT, 'mensagens.json'), 'utf8'));
  const inst = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const iguais = Object.keys(kit).filter((c) => !c.startsWith('_') && c !== 'DESCONHECIDO' && inst[c] !== undefined);
  assert.deepEqual(iguais, []);
});

// Montado em pedaços para este arquivo não se acusar.
const BARRA = '/';
const PROIBIDOS = [
  `new Reg${'Exp'}`,
  `Reg${'Exp'}(`,
  `.mat${'ch'}(`,
  `.mat${'chAll'}(`,
  `.sea${'rch'}(`,
  `.replace(${BARRA}`,
  `.replaceAll(${BARRA}`,
  `.split(${BARRA}`,
  `${BARRA}.test(`,
  `${BARRA}i.test(`,
  `${BARRA}g.test(`,
  `${BARRA}u.test(`,
];

test('nenhuma expressão regular no código do kit', () => {
  const lista = [
    ...arquivos(path.join(KIT, 'scripts'), ['.mjs']),
    ...arquivos(path.join(KIT, 'testes'), ['.mjs']),
    path.join(KIT, 'molde', 'reel', 'animacao.js'),
  ].filter((a) => a !== ESTE);
  const achados = [];
  for (const arquivo of lista) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const p of PROIBIDOS) if (texto.includes(p)) achados.push(`${path.relative(KIT, arquivo)}: ${p}`);
  }
  const py = path.join(KIT, 'py', 'transcrever.py');
  if (fs.existsSync(py)) {
    const texto = fs.readFileSync(py, 'utf8');
    for (const linha of texto.split('\n')) {
      const t = linha.trim();
      if (t === `import ${'re'}` || t.startsWith(`import ${'re'},`) || t.startsWith(`from ${'re'} import`)) achados.push('py/transcrever.py: import re');
    }
  }
  assert.deepEqual(achados, []);
});

// Termos que não podem aparecer no material do kit (montados em pedaços pelo mesmo motivo).
const PESSOAIS = [`/Us${'ers/'}`, `Chat${'2You'}`, `chat${'2you'}`, `Em d${'.ia'}`, `autonom${'ia'}.site`, `rodrigo${'victor'}`];

test('nenhum dado pessoal ou caminho de máquina no kit', () => {
  const lista = arquivos(KIT, ['.mjs', '.js', '.json', '.html', '.css', '.py', '.txt', '.md', '.svg']).filter((a) => a !== ESTE);
  const achados = [];
  for (const arquivo of lista) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const p of PESSOAIS) if (texto.includes(p)) achados.push(`${path.relative(KIT, arquivo)}: ${p}`);
  }
  assert.deepEqual(achados, []);
});
