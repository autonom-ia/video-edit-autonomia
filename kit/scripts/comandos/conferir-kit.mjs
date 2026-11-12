// Confere se o kit funciona de verdade: filtros do ffmpeg, fala, montador, navegador, ouvido e espelhos.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filtrosDisponiveis, encodersDisponiveis, FILTROS_NECESSARIOS, ffmpeg } from '../lib/ffmpeg.mjs';
import { doctor, montadorInstalado } from '../lib/hyperframes.mjs';
import { acharChrome } from '../lib/chrome.mjs';
import { earshot, earshotDisponivel } from '../lib/earshot.mjs';
import { rodarTranscricao } from '../lib/fala.mjs';
import { conferirEspelhos } from '../../testes/conferir-espelhos.mjs';
import { aviso } from '../lib/saida.mjs';
import { ultimasLinhas } from '../lib/executar.mjs';

async function tentar(funcao) {
  try {
    return await funcao();
  } catch (erro) {
    return { ok: false, texto: erro.codigo || String(erro.message || erro) };
  }
}

export default async function conferirKit() {
  const itens = [];
  const avisos = [];

  itens.push({ id: 'ffmpeg', ...(await tentar(async () => {
    const filtros = await filtrosDisponiveis();
    const encoders = await encodersDisponiveis();
    const faltam = FILTROS_NECESSARIOS.filter((f) => !filtros.has(f));
    if (!encoders.has('libx264')) faltam.push('libx264');
    return { ok: faltam.length === 0, texto: faltam.length ? `faltam: ${faltam.join(', ')}` : 'tesoura completa' };
  })) });

  itens.push({ id: 'fala', ...(await tentar(async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-conferir-'));
    try {
      const wav = path.join(pasta, 'silencio.wav');
      const r = await ffmpeg(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '2', wav]);
      if (r.codigo !== 0) return { ok: false, texto: 'não consegui gerar o áudio de teste' };
      const saida = path.join(pasta, 'transcricao.json');
      await rodarTranscricao(wav, saida);
      return { ok: fs.existsSync(saida), texto: 'ouvido de texto respondeu' };
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
    }
  })) });

  itens.push({ id: 'montador', ...(await tentar(async () => {
    if (!montadorInstalado()) return { ok: false, texto: 'montador não instalado' };
    const d = await doctor();
    return { ok: d.ok, texto: d.ok ? 'montador pronto' : `montador com problema: ${d.detalhe || 'veja hyperframes doctor'}`, falharam: d.falharam || [] };
  })) });

  itens.push({ id: 'navegador', ...(await tentar(async () => {
    const exe = await acharChrome();
    return { ok: Boolean(exe), texto: 'navegador escondido encontrado' };
  })) });

  if (earshotDisponivel()) {
    itens.push({ id: 'ouvido', ...(await tentar(async () => {
      const r = await earshot('doctor', []);
      return { ok: r.codigo === 0, texto: r.codigo === 0 ? 'ouvido de som pronto' : ultimasLinhas(r.erro || r.saida, 3) };
    })) });
  } else {
    avisos.push(aviso('OUVIDO_INDISPONIVEL', {}));
    itens.push({ id: 'ouvido', ok: true, texto: 'ouvido de som não instalado (o vídeo sai igual)', opcional: true });
  }

  itens.push({ id: 'espelhos', ...(await tentar(async () => {
    const r = conferirEspelhos();
    if (!r.ok) avisos.push(aviso('ESPELHO_DIFERENTE', { diferencas: r.diferencas.slice(0, 10) }));
    return { ok: r.ok, texto: r.ok ? 'instruções do assistente iguais nas duas cópias' : `${r.diferencas.length} diferença(s) entre as cópias` };
  })) });

  const ok = itens.every((i) => i.ok);
  return {
    ok,
    codigo: ok ? undefined : 'KIT_INCOMPLETO',
    resumo: ok ? 'O kit está completo e funcionando.' : `Faltou: ${itens.filter((i) => !i.ok).map((i) => i.id).join(', ')}.`,
    avisos,
    dados: { itens, total: itens.length, prontos: itens.filter((i) => i.ok).length },
  };
}
