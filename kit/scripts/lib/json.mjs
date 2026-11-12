// Leitura e escrita de JSON. A escrita é atômica: arquivo temporário e depois rename.
import fs from 'node:fs';
import path from 'node:path';
import { falha } from './saida.mjs';
import { relativoARaiz } from './caminhos.mjs';

export function lerJson(caminho, padrao) {
  if (!fs.existsSync(caminho)) {
    if (padrao !== undefined) return padrao;
    falha('ARQUIVO_NAO_ACHADO', { arquivo: relativoARaiz(caminho) });
  }
  const texto = fs.readFileSync(caminho, 'utf8');
  const limpo = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  try {
    return JSON.parse(limpo);
  } catch (erro) {
    falha('ARQUIVO_INVALIDO', { arquivo: relativoARaiz(caminho), detalhe: String(erro.message) });
  }
  return padrao;
}

export function escreverTexto(caminho, texto) {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const tmp = `${caminho}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, texto, 'utf8');
  try {
    fs.renameSync(tmp, caminho);
  } catch {
    fs.copyFileSync(tmp, caminho);
    fs.rmSync(tmp, { force: true });
  }
}

export function escreverJson(caminho, objeto) {
  escreverTexto(caminho, `${JSON.stringify(objeto, null, 2)}\n`);
}
