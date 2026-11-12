// Baixa o modelo do ouvido de texto. "auto": menos de 8 GB de memória usa o modelo pequeno.
import { escolha } from '../lib/args.mjs';
import { aviso } from '../lib/saida.mjs';
import { modeloAutomatico, prepararModelo } from '../lib/fala.mjs';
import { FALA } from '../lib/regras.mjs';

export default async function prepararFala({ opcoes }) {
  const pedido = escolha(opcoes, 'modelo', ['auto', FALA.modeloGrande, FALA.modeloPequeno], 'auto');
  const modelo = pedido === 'auto' ? modeloAutomatico() : pedido;
  const avisos = [];
  if (pedido === 'auto' && modelo === FALA.modeloPequeno) avisos.push(aviso('MEMORIA_POUCA_FALA', { modelo }));
  await prepararModelo(modelo);
  return {
    ok: true,
    resumo: `Ouvido de texto pronto, com o modelo ${modelo}.`,
    avisos,
    arquivos: { ficha: 'kit-fala.json' },
    dados: { modelo, pronto: true },
  };
}
