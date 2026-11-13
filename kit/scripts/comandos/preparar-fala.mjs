// Baixa o modelo do ouvido de texto. "auto": menos de 8 GB de memória usa o modelo pequeno.
import { escolha } from '../lib/args.mjs';
import { aviso } from '../lib/saida.mjs';
import { modeloAutomatico, prepararModelo } from '../lib/fala.mjs';
import { prepararLimpeza } from '../lib/voz-limpa.mjs';
import { FALA } from '../lib/regras.mjs';

export default async function prepararFala({ opcoes }) {
  const pedido = escolha(opcoes, 'modelo', ['auto', FALA.modeloGrande, FALA.modeloPequeno], 'auto');
  const modelo = pedido === 'auto' ? modeloAutomatico() : pedido;
  const avisos = [];
  if (pedido === 'auto' && modelo === FALA.modeloPequeno) avisos.push(aviso('MEMORIA_POUCA_FALA', { modelo }));
  await prepararModelo(modelo);
  // Modelo da limpeza de voz (10 MB). Se falhar, o cortar tenta de novo e, sem ele, usa o filtro antigo.
  const limpeza = await prepararLimpeza();
  if (limpeza.erro) avisos.push(aviso('VOZ_SEM_LIMPEZA', { detalhe: limpeza.erro }));
  return {
    ok: true,
    resumo: `Ouvido de texto pronto, com o modelo ${modelo}.`,
    avisos,
    arquivos: { ficha: 'kit-fala.json' },
    dados: { modelo, pronto: true },
  };
}
