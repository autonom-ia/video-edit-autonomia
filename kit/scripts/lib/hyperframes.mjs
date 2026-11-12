// HyperFrames: chama o binário do pacote com o próprio Node (sem npx), sem telemetria.
import path from 'node:path';
import fs from 'node:fs';
import { RAIZ } from './caminhos.mjs';
import { rodar, ultimasLinhas } from './executar.mjs';
import { ambienteFilhos } from './ambiente.mjs';
import { falha } from './saida.mjs';
import { exigirForaDaArea, codigoDoNavegador } from './area-protegida.mjs';

export const BIN_HYPERFRAMES = path.join(RAIZ, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs');

export function montadorInstalado() {
  return fs.existsSync(BIN_HYPERFRAMES);
}

export async function hyperframes(argumentos, opcoes = {}) {
  if (!montadorInstalado()) falha('MONTADOR_FALTANDO', {});
  const env = ambienteFilhos({ HYPERFRAMES_NO_TELEMETRY: '1', HYPERFRAMES_NO_UPDATE_CHECK: '1', HYPERFRAMES_SKIP_SKILLS: '1' });
  return rodar(process.execPath, [BIN_HYPERFRAMES, ...argumentos], { env, timeoutMs: 60 * 60 * 1000, ...opcoes });
}

// Só estas checagens do "hyperframes doctor" importam para montar o vídeo. As outras
// (Docker, TTS, BGM, versão nova disponível) são opcionais e não podem reprovar o kit.
// É o mesmo filtro dos instaladores (JS_DOCTOR no instalar.sh e Test-Montador no instalar.ps1).
export const CHECAGENS_ESSENCIAIS = Object.freeze(['Node.js', 'FFmpeg', 'FFprobe', 'Chrome']);

// Recebe o JSON do doctor e devolve { ok, falharam }. "falharam" lista os nomes essenciais
// que vieram com ok falso ou que nem apareceram.
export function avaliarDoctor(dados) {
  const checks = dados && Array.isArray(dados.checks) ? dados.checks : [];
  const falharam = CHECAGENS_ESSENCIAIS.filter((nome) => {
    const c = checks.find((x) => x && x.name === nome);
    return !c || c.ok !== true;
  });
  return { ok: falharam.length === 0, falharam };
}

export async function doctor() {
  const r = await hyperframes(['doctor', '--json'], { timeoutMs: 180000 });
  const texto = r.saida.trim();
  const inicio = texto.indexOf('{');
  if (inicio === -1) return { ok: false, falharam: [...CHECAGENS_ESSENCIAIS], detalhe: ultimasLinhas(r.erro || r.saida, 6) };
  try {
    const dados = JSON.parse(texto.slice(inicio));
    const { ok, falharam } = avaliarDoctor(dados);
    return { ok, falharam, detalhe: falharam.length ? `falhou: ${falharam.join(', ')}` : '', dados };
  } catch {
    return { ok: false, falharam: [...CHECAGENS_ESSENCIAIS], detalhe: ultimasLinhas(texto, 6) };
  }
}

export async function caminhoDoNavegador() {
  if (!montadorInstalado()) return '';
  const r = await hyperframes(['browser', 'path'], { timeoutMs: 120000 });
  if (r.codigo !== 0) return '';
  const linhas = r.saida.split('\n').map((l) => l.trim()).filter(Boolean);
  const ultima = linhas[linhas.length - 1] || '';
  return fs.existsSync(ultima) ? ultima : '';
}

// Render local. qualidade: draft (prévia) ou delivery (entrega).
export async function renderizar(pastaComp, saida, qualidade) {
  exigirForaDaArea('o navegador escondido que desenha o vídeo');
  const args = ['render', pastaComp, '--output', saida, '--quality', qualidade, '--fps', '30', '--format', 'mp4', '--sdr', '--quiet'];
  const r = await hyperframes(args, { cwd: pastaComp, timeoutMs: 2 * 60 * 60 * 1000 });
  if (r.codigo !== 0 || !fs.existsSync(saida)) {
    const detalhe = ultimasLinhas(`${r.saida}\n${r.erro}`, 10);
    const semNavegador = detalhe.toLowerCase().includes('browser') || detalhe.toLowerCase().includes('chrome');
    const codigo = codigoDoNavegador(detalhe);
    falha(codigo === 'AREA_PROTEGIDA' || semNavegador ? codigo : 'RENDER_FALHOU', { detalhe });
  }
  return saida;
}

// Fotografa a composição em instantes exatos (sem render completo).
export async function fotografar(pastaComp, tempos, pastaSaida) {
  exigirForaDaArea('o navegador escondido que desenha o vídeo');
  const at = tempos.map((t) => String(Math.round(t * 1000) / 1000)).join(',');
  const r = await hyperframes(['snapshot', pastaComp, '--at', at, '--output', pastaSaida, '--keep', '--no-end'], {
    cwd: pastaComp,
    timeoutMs: 20 * 60 * 1000,
  });
  if (r.codigo !== 0) {
    const detalhe = ultimasLinhas(`${r.saida}\n${r.erro}`, 8);
    falha(codigoDoNavegador(detalhe), { detalhe });
  }
  return fs.readdirSync(pastaSaida).filter((n) => n.toLowerCase().endsWith('.png')).map((n) => path.join(pastaSaida, n));
}
