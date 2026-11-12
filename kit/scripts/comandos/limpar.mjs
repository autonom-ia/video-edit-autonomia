// Libera espaço apagando só o que se refaz sozinho: caches de render da composição e os quadros.
// Nunca apaga o take, a voz, a prévia nem os vídeos finais.
import fs from 'node:fs';
import path from 'node:path';
import { abrirProjeto } from '../lib/projeto.mjs';
import { arred } from '../lib/texto.mjs';

function tamanho(caminho) {
  if (!fs.existsSync(caminho)) return 0;
  const st = fs.lstatSync(caminho);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(caminho).reduce((s, n) => s + tamanho(path.join(caminho, n)), 0);
}

export default async function limpar({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const alvos = [projeto.arq('comp', '.hyperframes'), projeto.arq('comp', 'renders'), projeto.arq('quadros'), projeto.arq('trilha', 'tmp')];
  let liberado = 0;
  const apagados = [];
  for (const alvo of alvos) {
    if (!fs.existsSync(alvo)) continue;
    liberado += tamanho(alvo);
    fs.rmSync(alvo, { recursive: true, force: true });
    apagados.push(projeto.rel(path.relative(projeto.pasta, alvo)));
  }
  const mb = arred(liberado / 1024 ** 2, 1);
  return { ok: true, resumo: `Liberei ${mb} MB.`, dados: { liberado_mb: mb, apagados } };
}
