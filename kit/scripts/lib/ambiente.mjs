// Monta o ambiente dos processos filhos. Completa o que o wrapper não exportou (spec D.1).
import path from 'node:path';
import { FERR, RAIZ, EH_WINDOWS, existe } from './caminhos.mjs';

export function ambienteFilhos(extra = {}) {
  const env = { ...process.env };
  const def = (nome, valor) => {
    if (!env[nome]) env[nome] = valor;
  };
  const sep = EH_WINDOWS ? ';' : ':';
  const binFerr = path.join(FERR, 'bin');
  const binNode = EH_WINDOWS ? path.join(FERR, 'node') : path.join(FERR, 'node', 'bin');
  const chavePath = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
  const atual = env[chavePath] || '';
  const partes = atual.split(sep);
  const novo = [];
  if (!partes.includes(binFerr)) novo.push(binFerr);
  if (!partes.includes(binNode)) novo.push(binNode);
  env[chavePath] = [...novo, atual].filter(Boolean).join(sep);

  def('ESTUDIO_FERRAMENTAS', FERR);
  def('ESTUDIO_REPO', RAIZ);
  def('UV_PYTHON_INSTALL_DIR', path.join(FERR, 'python'));
  def('UV_TOOL_DIR', path.join(FERR, 'uv-tools'));
  def('UV_TOOL_BIN_DIR', binFerr);
  def('UV_CACHE_DIR', path.join(FERR, 'cache', 'uv'));
  def('UV_PROJECT_ENVIRONMENT', path.join(FERR, 'venv'));
  def('UV_NO_MODIFY_PATH', '1');
  def('HF_HOME', path.join(FERR, 'cache', 'hf'));
  def('EARSHOT_HOME', path.join(FERR, 'cache', 'earshot'));
  def('EARSHOT_THREADS', '3');
  def('HYPERFRAMES_CACHE_DIR', path.join(FERR, 'cache', 'hyperframes'));
  def('HYPERFRAMES_NO_TELEMETRY', '1');
  env.HYPERFRAMES_NO_UPDATE_CHECK = '1';
  const ffmpeg = path.join(binFerr, EH_WINDOWS ? 'ffmpeg.exe' : 'ffmpeg');
  const ffprobe = path.join(binFerr, EH_WINDOWS ? 'ffprobe.exe' : 'ffprobe');
  if (existe(ffmpeg)) def('HYPERFRAMES_FFMPEG_PATH', ffmpeg);
  if (existe(ffprobe)) def('HYPERFRAMES_FFPROBE_PATH', ffprobe);
  env.HF_HUB_DISABLE_TELEMETRY = '1';
  env.PYTHONIOENCODING = 'utf-8';
  env.PYTHONUTF8 = '1';
  return { ...env, ...extra };
}
