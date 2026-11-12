// Abre um arquivo ou pasta no Finder, no Explorer ou no programa padrão.
import fs from 'node:fs';
import { daRaiz, relativoARaiz } from '../lib/caminhos.mjs';
import { falha } from '../lib/saida.mjs';
import { abrir as abrirNoSistema } from '../lib/abrir.mjs';

export default async function abrir({ posicionais, opcoes }) {
  const pedido = posicionais[0] || (typeof opcoes.caminho === 'string' ? opcoes.caminho : '');
  if (!pedido) falha('ARGUMENTO_FALTANDO', { argumento: '<caminho>' });
  const caminho = daRaiz(pedido);
  if (!fs.existsSync(caminho)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  abrirNoSistema(caminho);
  return { ok: true, resumo: 'Abri para você.', arquivos: { aberto: relativoARaiz(caminho) } };
}
