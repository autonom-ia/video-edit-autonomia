// Confere o briefing e gera minha-marca/marca.json (cores, letras, tom e proibidos).
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS } from '../lib/caminhos.mjs';
import { lerJson, escreverJson } from '../lib/json.mjs';
import { validarCom } from '../lib/validar.mjs';
import { falha } from '../lib/saida.mjs';
import { obrigatoriosFaltando, provasSemOrigem, gerarMarca, lerCatalogo } from '../lib/marca.mjs';

export default async function marca() {
  const arquivo = path.join(PASTAS.marca, 'briefing.json');
  if (!fs.existsSync(arquivo)) falha('BRIEFING_INCOMPLETO', { faltando: ['briefing.json'] });
  const briefing = lerJson(arquivo);
  const erros = validarCom('briefing', briefing);
  if (erros.length) falha('BRIEFING_INCOMPLETO', { faltando: [], problemas: erros.slice(0, 20) });
  const faltando = obrigatoriosFaltando(briefing);
  if (faltando.length) falha('BRIEFING_INCOMPLETO', { faltando });
  const semOrigem = provasSemOrigem(briefing);
  if (semOrigem.length) falha('NUMERO_SEM_ORIGEM', { campos: semOrigem });
  const paleta0 = lerJson(path.join(PASTAS.marca, 'escolhas', 'paleta-0.json'), null);
  const { marca: ficha, avisos } = gerarMarca(briefing, {
    paletas: lerCatalogo('paletas.json'),
    pares: lerCatalogo('pares-de-fonte.json'),
    proibidosPadrao: lerCatalogo('proibidos-padrao.json'),
    paleta0,
  });
  const erroMarca = validarCom('marca', ficha);
  if (erroMarca.length) falha('ARQUIVO_INVALIDO', { arquivo: 'minha-marca/marca.json', problemas: erroMarca.slice(0, 10) });
  const destino = path.join(PASTAS.marca, 'marca.json');
  escreverJson(destino, ficha);
  return {
    ok: true,
    resumo: `Marca de ${ficha.nome} guardada.`,
    avisos,
    arquivos: { marca: 'minha-marca/marca.json' },
    dados: { cores: ficha.cores, fontes: { titulo: ficha.fontes.titulo.familia, leitura: ficha.fontes.leitura.familia } },
  };
}
