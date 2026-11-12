// Confere por sha256 que AGENTS.md = CLAUDE.md e que .agents/skills = .claude/skills
// (as pastas hyperframes* ficam de fora: são instaladas pelo montador, não versionadas).
// Uso direto: node kit/testes/conferir-espelhos.mjs  (sai 0 se igual, 1 se diferente; última linha JSON)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const hash = (arquivo) => crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');

function listar(base, rel = '') {
  const dir = path.join(base, rel);
  if (!fs.existsSync(dir)) return [];
  const saida = [];
  for (const nome of fs.readdirSync(dir).sort()) {
    if (nome === '.DS_Store' || nome === 'Thumbs.db') continue;
    if (!rel && nome.startsWith('hyperframes')) continue;
    const r = rel ? `${rel}/${nome}` : nome;
    const c = path.join(base, r);
    if (fs.statSync(c).isDirectory()) saida.push(...listar(base, r));
    else saida.push(r);
  }
  return saida;
}

export function conferirEspelhos(raiz = RAIZ) {
  const diferencas = [];
  const a = path.join(raiz, 'AGENTS.md');
  const c = path.join(raiz, 'CLAUDE.md');
  if (!fs.existsSync(a) || !fs.existsSync(c)) diferencas.push({ arquivo: 'AGENTS.md/CLAUDE.md', problema: 'falta um dos dois' });
  else if (hash(a) !== hash(c)) diferencas.push({ arquivo: 'AGENTS.md/CLAUDE.md', problema: 'conteúdo diferente' });
  const fonte = path.join(raiz, '.agents', 'skills');
  const copia = path.join(raiz, '.claude', 'skills');
  const lf = listar(fonte);
  const lc = listar(copia);
  if (!lf.length) diferencas.push({ arquivo: '.agents/skills', problema: 'pasta vazia ou ausente' });
  for (const r of lf) {
    if (!lc.includes(r)) diferencas.push({ arquivo: r, problema: 'falta em .claude/skills' });
    else if (hash(path.join(fonte, r)) !== hash(path.join(copia, r))) diferencas.push({ arquivo: r, problema: 'conteúdo diferente' });
  }
  for (const r of lc) if (!lf.includes(r)) diferencas.push({ arquivo: r, problema: 'falta em .agents/skills' });
  return { ok: diferencas.length === 0, diferencas, arquivos: lf.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const r = conferirEspelhos();
  process.stdout.write(`${JSON.stringify(r)}\n`);
  process.exitCode = r.ok ? 0 : 1;
}
