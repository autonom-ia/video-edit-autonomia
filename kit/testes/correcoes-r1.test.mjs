// Testes das correções da revisão 1: doctor só com o essencial, fala sem Python fixo,
// pasta de ferramentas dentro do estúdio, escolha da música, receber olhando Downloads,
// página de aprovação e conferência da distribuição.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { avaliarDoctor, CHECAGENS_ESSENCIAIS } from '../scripts/lib/hyperframes.mjs';
import { argumentosDoUv, ambienteDaFala, lerVersoes } from '../scripts/lib/fala.mjs';
import { pastaFerramentas, NOME_PASTA_FERRAMENTAS } from '../scripts/lib/caminhos.mjs';
import { planejarEscolha } from '../scripts/comandos/variantes.mjs';
import { descricaoDaMusica, etiquetasDoItem } from '../scripts/lib/openverse.mjs';
import { videosEmDownloads, trazerDeDownloads } from '../scripts/comandos/receber.mjs';
import { escritoNaTela, montarPagina, textoDaTela } from '../scripts/comandos/pagina-de-aprovacao.mjs';
import { conferirDistribuicao, linhasComMarcador, repositoriosErrados } from '../scripts/comandos/conferir-distribuicao.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(AQUI, '..');
const ler = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));
const pastaTemp = (nome) => fs.mkdtempSync(path.join(os.tmpdir(), `estudio-${nome}-`));

// ---------- doctor ----------

test('doctor: Docker, TTS, MusicGen e versão nova não reprovam o kit', () => {
  const dados = ler(AQUI, 'fixtures', 'doctor-exemplo.json');
  assert.equal(dados.ok, false);
  assert.deepEqual(avaliarDoctor(dados), { ok: true, falharam: [] });
});

test('doctor: devolve o nome de cada checagem essencial que falhou ou sumiu', () => {
  const dados = ler(AQUI, 'fixtures', 'doctor-exemplo.json');
  const semChrome = { ...dados, checks: dados.checks.map((c) => (c.name === 'Chrome' ? { ...c, ok: false } : c)).filter((c) => c.name !== 'FFprobe') };
  assert.deepEqual(avaliarDoctor(semChrome), { ok: false, falharam: ['FFprobe', 'Chrome'] });
  assert.deepEqual(avaliarDoctor(null), { ok: false, falharam: [...CHECAGENS_ESSENCIAIS] });
});

// ---------- fala ----------

test('fala: uv com --frozen e sem Python fixo; UV_PYTHON só quando existe', () => {
  const sem = argumentosDoUv(['--preparar'], {});
  assert.ok(sem.includes('--frozen'));
  assert.ok(!sem.includes('--python'));
  assert.ok(!sem.includes('3.12'));
  const com = argumentosDoUv(['--preparar'], { UV_PYTHON: 'cpython-3.12-windows-x86_64' });
  assert.equal(com[com.indexOf('--python') + 1], 'cpython-3.12-windows-x86_64');
});

test('fala: revisão fixa do modelo vem de versoes.env, e a variável do ambiente vale mais', () => {
  const pasta = pastaTemp('versoes');
  const arq = path.join(pasta, 'versoes.env');
  fs.writeFileSync(arq, '# comentário\nFALA_MODELO_REVISAO=abc123\nOUTRA=1=2\n', 'utf8');
  const versoes = lerVersoes(arq);
  assert.equal(versoes.OUTRA, '1=2');
  assert.deepEqual(ambienteDaFala({}, versoes), { FALA_MODELO_REVISAO: 'abc123' });
  assert.deepEqual(ambienteDaFala({ FALA_MODELO_REVISAO: 'xyz' }, versoes), {});
  fs.rmSync(pasta, { recursive: true, force: true });
});

// ---------- pasta de ferramentas ----------

test('pasta de ferramentas fica dentro do estúdio, em .ferramentas', () => {
  const raiz = path.resolve('estudio-teste');
  assert.equal(NOME_PASTA_FERRAMENTAS, '.ferramentas');
  assert.equal(pastaFerramentas(raiz, {}), path.join(raiz, '.ferramentas'));
  assert.equal(pastaFerramentas(raiz, { ESTUDIO_FERRAMENTAS: path.join(raiz, '.ferramentas') }), path.join(raiz, '.ferramentas'));
});

// ---------- música ----------

test('escolha da música: só as aprovadas, na ordem, no máximo 3, numeradas de 1 a 3', () => {
  const resultado = [
    { opcao: 4, esquema: 'equilibrada', mostrar: true },
    { opcao: 1, esquema: 'abafada', mostrar: true },
    { opcao: 2, esquema: 'silencio', mostrar: false },
    { opcao: 3, esquema: 'equilibrada', mostrar: true },
    { opcao: 5, esquema: 'equilibrada', mostrar: true },
  ];
  assert.deepEqual(planejarEscolha(resultado), [
    { musica: 1, opcao: 1, esquema: 'abafada' },
    { musica: 2, opcao: 3, esquema: 'equilibrada' },
    { musica: 3, opcao: 4, esquema: 'equilibrada' },
  ]);
});

test('descrição da música só com título e etiquetas do Openverse', () => {
  const etiquetas = etiquetasDoItem({ tags: [{ name: 'Piano' }, { name: 'piano' }, { name: 'calm' }, { name: '' }, { name: 'ambient' }, { name: 'extra' }] });
  assert.deepEqual(etiquetas, ['piano', 'calm', 'ambient']);
  assert.equal(descricaoDaMusica({ titulo: 'Manhã', etiquetas }), '"Manhã", etiquetas: piano, calm, ambient, licença livre');
  assert.equal(descricaoDaMusica({ titulo: '', etiquetas: [] }), '"sem título", licença livre');
});

// ---------- receber: Downloads ----------

test('receber: acha vídeo recente em Downloads e ignora oculto, não vídeo e já usado', () => {
  const pasta = pastaTemp('downloads');
  for (const nome of ['IMG_1.MOV', 'outro.mp4', '.escondido.mp4', 'nota.txt', 'usado.mp4']) fs.writeFileSync(path.join(pasta, nome), nome);
  const tamanhoUsado = fs.statSync(path.join(pasta, 'usado.mp4')).size;
  const r = videosEmDownloads({ pasta, usados: new Set([`usado.mp4|${tamanhoUsado}`]) });
  assert.equal(r.semPermissao, false);
  assert.deepEqual(r.videos.map((v) => v.nome).sort(), ['IMG_1.MOV', 'outro.mp4']);
  const depois = videosEmDownloads({ pasta, agora: Date.now() + 48 * 60 * 60 * 1000 });
  assert.deepEqual(depois.videos, []);
  assert.deepEqual(videosEmDownloads({ pasta: path.join(pasta, 'nao-existe') }), { videos: [], semPermissao: false });
  fs.rmSync(pasta, { recursive: true, force: true });
});

test('receber: trazer copia de Downloads sem apagar, reaproveita igual e não sobrescreve diferente', () => {
  const origem = pastaTemp('origem');
  const destino = pastaTemp('brutos');
  fs.writeFileSync(path.join(origem, 'IMG_2.mov'), 'video-a');
  const a = trazerDeDownloads('IMG_2.mov', { origem, destino });
  assert.equal(path.basename(a), 'IMG_2.mov');
  assert.ok(fs.existsSync(path.join(origem, 'IMG_2.mov')));
  assert.equal(trazerDeDownloads('IMG_2.mov', { origem, destino }), a);
  fs.writeFileSync(path.join(origem, 'IMG_2.mov'), 'video-b-maior');
  const b = trazerDeDownloads('IMG_2.mov', { origem, destino });
  assert.equal(path.basename(b), 'IMG_2-2.mov');
  assert.equal(fs.readFileSync(a, 'utf8'), 'video-a');
  assert.throws(() => trazerDeDownloads('nota.txt', { origem, destino }), (erro) => erro.codigo === 'SEM_VIDEO');
  fs.rmSync(origem, { recursive: true, force: true });
  fs.rmSync(destino, { recursive: true, force: true });
});

// ---------- página de aprovação ----------

test('página de aprovação: gancho e textos das telas, em linguagem de gente', () => {
  const cenas = ler(KIT, 'esquemas', 'exemplos', 'cenas.json');
  const escrito = escritoNaTela(cenas);
  assert.equal(escrito[0].quando, 'No começo do vídeo');
  assert.deepEqual(escrito[0].textos, ['Seu bolo chega menor que a festa?', 'Para quem organiza aniversário']);
  assert.deepEqual(escrito[1].textos, ['Conte os convidados', 'Some 10% de folga', 'Peça por fatias']);
  assert.ok(escrito[1].quando.startsWith('Quando você diz "A conta certa'));
  assert.deepEqual(textoDaTela({ tipo: 'conversa', campos: { nome: 'Ana', mensagens: [{ de: 'eu', texto: 'Oi' }] } }), ['Oi']);
  assert.deepEqual(escritoNaTela(null), []);
});

test('página de aprovação: letra grande, texto escapado, imagens e nada técnico', () => {
  const html = montarPagina({
    titulo: 'Bolo <certo>',
    blocos: [{ texto: 'O bolo chegou & sobrou.' }],
    escrito: [{ quando: 'No começo do vídeo', textos: ['Seu bolo?'] }],
    imagens: ['amostras/estilo-1.png', 'amostras/estilo-2.png', 'amostras/estilo-3.png'],
    marca: null,
  });
  assert.ok(html.includes('Bolo &lt;certo&gt;'));
  assert.ok(html.includes('O bolo chegou &amp; sobrou.'));
  assert.equal(html.split('<img ').length - 1, 3);
  for (const tecnico of ['./estudio', '.json', 'roteiro.md', 'terminal', 'comando']) assert.ok(!html.includes(tecnico), tecnico);
  const semImagens = montarPagina({ titulo: 'x', blocos: [{ texto: 'a' }], escrito: [], imagens: [], marca: null });
  assert.ok(!semImagens.includes('<img '));
  assert.ok(semImagens.includes('só a legenda da sua fala'));
});

// ---------- conferir-distribuicao ----------

function distribuicaoDeTeste({ readme, comandos, versoes, comTravas = true, travaCerta = true }) {
  const raiz = pastaTemp('distribuicao');
  fs.mkdirSync(path.join(raiz, 'instalar'));
  fs.writeFileSync(path.join(raiz, 'README.md'), readme, 'utf8');
  fs.writeFileSync(path.join(raiz, 'instalar', 'comandos-unicos.md'), comandos, 'utf8');
  fs.writeFileSync(path.join(raiz, 'instalar', 'versoes.env'), versoes, 'utf8');
  fs.writeFileSync(path.join(raiz, 'package.json'), JSON.stringify({ dependencies: { hyperframes: '0.9.20' } }), 'utf8');
  if (comTravas) {
    const dep = travaCerta ? '0.9.20' : '0.9.19';
    fs.writeFileSync(path.join(raiz, 'package-lock.json'), JSON.stringify({ packages: { '': { dependencies: { hyperframes: dep } } } }), 'utf8');
    fs.writeFileSync(path.join(raiz, 'uv.lock'), 'version = 1\n', 'utf8');
  }
  return raiz;
}

const CERTO = 'https://github.com/autonom-ia/video-edit-autonomia/archive/refs/tags/v1.0.0.zip';

test('conferir-distribuicao: passa com endereço oficial e travas em dia', () => {
  const raiz = distribuicaoDeTeste({
    readme: `curl -fL -o estudio.zip "${CERTO}" && mv video-edit-autonomia-1.0.0 ~/estudio-de-reels\n`,
    comandos: 'gh release download v1.0.0 --repo autonom-ia/video-edit-autonomia --archive zip\nhttps://github.com/cli/cli/releases/download/v2/gh.zip\nCONTATO com a gente\n',
    versoes: 'ESTUDIO_ATUALIZAR_URL=https://github.com/autonom-ia/video-edit-autonomia/releases/latest/download/estudio-de-reels.zip\nFFMPEG=https://github.com/BtbN/FFmpeg-Builds/releases\n# so aceita https://github.com/<esta conta>/...\n',
  });
  assert.deepEqual(conferirDistribuicao(raiz), { ok: true, problemas: [] });
  fs.rmSync(raiz, { recursive: true, force: true });
});

test('conferir-distribuicao: falha com CONTA, repositório antigo, trava faltando ou velha', () => {
  const raiz = distribuicaoDeTeste({
    readme: 'curl "https://github.com/CONTA/estudio-de-reels/archive/refs/tags/v1.0.0.zip"\n',
    comandos: 'gh release download --repo autonom-ia/estudio-de-reels\n',
    versoes: 'X=1\n',
    comTravas: false,
  });
  const r = conferirDistribuicao(raiz);
  assert.equal(r.ok, false);
  const tudo = r.problemas.join('\n');
  for (const trecho of ['README.md: sobrou o marcador CONTA na(s) linha(s) 1', 'CONTA/estudio-de-reels', 'autonom-ia/estudio-de-reels', 'package-lock.json: falta', 'uv.lock: falta']) {
    assert.ok(tudo.includes(trecho), trecho);
  }
  fs.rmSync(raiz, { recursive: true, force: true });
  const velha = distribuicaoDeTeste({ readme: CERTO, comandos: CERTO, versoes: CERTO, travaCerta: false });
  assert.ok(conferirDistribuicao(velha).problemas.join('\n').includes('não bate com package.json em: hyperframes'));
  fs.rmSync(velha, { recursive: true, force: true });
});

test('marcador CONTA só como palavra inteira; FFmpeg e afins não contam como repositório errado', () => {
  assert.deepEqual(linhasComMarcador('CONTATO\nCONTAS\nx CONTA/y\n`CONTA`'), [3, 4]);
  assert.deepEqual(repositoriosErrados('https://github.com/GyanD/codexffmpeg/releases'), []);
  assert.equal(repositoriosErrados('https://github.com/outra/video-edit-autonomia').length, 1);
});
