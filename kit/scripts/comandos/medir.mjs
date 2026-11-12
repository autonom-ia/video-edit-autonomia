// Mede o volume de um arquivo (LUFS, pico, faixa dinâmica, canais). --celular simula o alto-falante.
import fs from 'node:fs';
import { daRaiz } from '../lib/caminhos.mjs';
import { exigir } from '../lib/args.mjs';
import { falha } from '../lib/saida.mjs';
import { loudness, sondar } from '../lib/ffmpeg.mjs';
import { FILTRO_CELULAR } from '../lib/mixer.mjs';

export default async function medir({ opcoes }) {
  const pedido = exigir(opcoes, 'arquivo');
  const arquivo = daRaiz(pedido);
  if (!fs.existsSync(arquivo)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  const celular = opcoes.celular === true;
  const sonda = await sondar(arquivo);
  const audio = (sonda.streams || []).find((s) => s.codec_type === 'audio');
  if (!audio) falha('VIDEO_SEM_SOM', { arquivo: pedido });
  const r = await loudness(arquivo, celular ? FILTRO_CELULAR : '');
  return {
    ok: true,
    resumo: `${r.lufs} LUFS, pico ${r.pico_dbtp} dBTP${celular ? ' (simulando o celular)' : ''}.`,
    dados: { lufs: r.lufs, pico_dbtp: r.pico_dbtp, lra: r.lra, canais: Number(audio.channels || 0), celular },
  };
}
