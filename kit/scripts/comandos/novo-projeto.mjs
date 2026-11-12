// Cria projetos/<AAAA-MM-DD>-<slug>/estado.json.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS, relativoARaiz } from '../lib/caminhos.mjs';
import { exigir, escolha } from '../lib/args.mjs';
import { escreverJson } from '../lib/json.mjs';
import { estadoNovo } from '../lib/projeto.mjs';
import { slug, hoje } from '../lib/texto.mjs';

export default async function novoProjeto({ opcoes }) {
  const titulo = exigir(opcoes, 'titulo').trim();
  const caminho = escolha(opcoes, 'caminho', ['A', 'B']);
  const base = `${hoje()}-${slug(titulo)}`;
  let nome = base;
  let n = 2;
  while (fs.existsSync(path.join(PASTAS.projetos, nome))) nome = `${base}-${n++}`;
  const pasta = path.join(PASTAS.projetos, nome);
  fs.mkdirSync(pasta, { recursive: true });
  escreverJson(path.join(pasta, 'estado.json'), estadoNovo(nome, titulo, caminho));
  return {
    ok: true,
    resumo: `Projeto criado: ${nome}.`,
    arquivos: { projeto: nome, estado: relativoARaiz(path.join(pasta, 'estado.json')) },
    dados: { projeto: nome, caminho },
  };
}
