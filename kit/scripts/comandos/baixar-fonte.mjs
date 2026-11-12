// Baixa uma letra livre (OFL) do repositório público de fontes do Google no GitHub.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS, relativoARaiz } from '../lib/caminhos.mjs';
import { exigir } from '../lib/args.mjs';
import { falha } from '../lib/saida.mjs';
import { slugDeFonte } from '../lib/marca.mjs';

const API = 'https://api.github.com/repos/google/fonts/contents';
const UA = { 'User-Agent': 'estudio-de-reels/1.0', Accept: 'application/vnd.github+json' };

async function listar(pasta) {
  let r;
  try {
    r = await fetch(`${API}/${pasta}`, { headers: UA });
  } catch (erro) {
    falha('REDE_FALHOU', { detalhe: String(erro && erro.message) });
  }
  if (r.status === 404) return null;
  if (!r.ok) falha('REDE_FALHOU', { detalhe: `GitHub respondeu ${r.status}` });
  const dados = await r.json();
  return Array.isArray(dados) ? dados : null;
}

async function baixar(url, destino) {
  const r = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!r.ok) falha('REDE_FALHOU', { detalhe: `download respondeu ${r.status}` });
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

export default async function baixarFonte({ opcoes }) {
  const familia = exigir(opcoes, 'familia').trim();
  const slug = slugDeFonte(familia);
  if (!slug) falha('FONTE_NAO_ACHADA', { familia });
  let itens = null;
  let licenca = '';
  for (const grupo of ['ofl', 'apache', 'ufl']) {
    itens = await listar(`${grupo}/${slug}`);
    if (itens) {
      licenca = grupo;
      break;
    }
  }
  if (!itens) falha('FONTE_NAO_ACHADA', { familia });
  const ttfs = itens.filter((i) => i.type === 'file' && i.name.toLowerCase().endsWith('.ttf'));
  const semItalico = ttfs.filter((i) => !i.name.toLowerCase().includes('italic'));
  const escolhidos = (semItalico.length ? semItalico : ttfs).slice(0, 4);
  if (!escolhidos.length) falha('FONTE_NAO_ACHADA', { familia });
  const destino = path.join(PASTAS.marca, 'fontes', slug);
  fs.mkdirSync(destino, { recursive: true });
  for (const item of escolhidos) await baixar(item.download_url, path.join(destino, item.name));
  const textoLicenca = itens.find((i) => ['ofl.txt', 'license.txt'].includes(i.name.toLowerCase()));
  if (textoLicenca) await baixar(textoLicenca.download_url, path.join(destino, textoLicenca.name));
  return {
    ok: true,
    resumo: `Baixei a letra ${familia}.`,
    arquivos: { pasta: relativoARaiz(destino) },
    dados: { familia, licenca, arquivos: escolhidos.map((i) => i.name) },
  };
}
