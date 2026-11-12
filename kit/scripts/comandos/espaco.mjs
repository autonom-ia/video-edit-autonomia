// Espaço livre no disco onde está o estúdio.
import fs from 'node:fs';
import { RAIZ } from '../lib/caminhos.mjs';
import { aviso } from '../lib/saida.mjs';
import { ESPACO } from '../lib/regras.mjs';
import { arred } from '../lib/texto.mjs';

export function espacoLivreGb() {
  const st = fs.statfsSync(RAIZ);
  return arred((Number(st.bavail) * Number(st.bsize)) / 1024 ** 3, 1);
}

export default async function espaco() {
  const livre = espacoLivreGb();
  const avisos = livre < ESPACO.avisoRenderGb ? [aviso('POUCO_ESPACO_RENDER', { livre_gb: livre })] : [];
  return { ok: true, resumo: `${livre} GB livres.`, avisos, dados: { livre_gb: livre } };
}
