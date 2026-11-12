// Segunda opinião do ouvido de som (earshot). Sem o ouvido instalado, responde ok com disponivel:false.
// --com é a descrição em texto usada pelos modos match e rank.
import fs from 'node:fs';
import path from 'node:path';
import { daRaiz, relativoARaiz } from '../lib/caminhos.mjs';
import { exigir, escolha } from '../lib/args.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { earshot, earshotDisponivel } from '../lib/earshot.mjs';
import { ultimasLinhas } from '../lib/executar.mjs';

export async function ouvirArquivo(arquivo, modo, pastaSaida, com = '') {
  fs.mkdirSync(pastaSaida, { recursive: true });
  let args;
  let saida;
  if (modo === 'critique') {
    saida = path.join(pastaSaida, 'critique.json');
    args = [arquivo, '--json', '--out', saida];
  } else if (modo === 'timeline') {
    saida = path.join(pastaSaida, 'timeline.json');
    args = [arquivo, '--json', '--out', saida];
  } else if (modo === 'sheet') {
    saida = path.join(pastaSaida, 'sheet.png');
    args = [arquivo, '-o', saida, '--out', path.join(pastaSaida, 'sheet.json')];
  } else if (modo === 'match') {
    saida = path.join(pastaSaida, 'match.json');
    args = [arquivo, com, '--json', '--out', saida];
  } else {
    saida = path.join(pastaSaida, 'rank.json');
    args = [com, arquivo, '--json', '--out', saida];
  }
  const r = await earshot(modo, args);
  if (!r.disponivel) return { disponivel: false };
  const texto = path.join(pastaSaida, `${modo}.txt`);
  fs.writeFileSync(texto, r.saida || '', 'utf8');
  if (r.codigo !== 0) return { disponivel: true, ok: false, detalhe: ultimasLinhas(r.erro || r.saida, 6) };
  return { disponivel: true, ok: true, saida: fs.existsSync(saida) ? saida : texto, texto };
}

export default async function ouvir({ opcoes }) {
  const pedido = exigir(opcoes, 'arquivo');
  const arquivo = daRaiz(pedido);
  if (!fs.existsSync(arquivo)) falha('ARQUIVO_NAO_ACHADO', { arquivo: pedido });
  const modo = escolha(opcoes, 'modo', ['critique', 'timeline', 'sheet', 'match', 'rank']);
  const com = typeof opcoes.com === 'string' ? opcoes.com : '';
  if ((modo === 'match' || modo === 'rank') && !com) falha('ARGUMENTO_FALTANDO', { argumento: '--com', explicacao: 'descrição do som em texto' });
  if (!earshotDisponivel()) {
    return { ok: true, resumo: 'O ouvido de som não está instalado neste computador.', avisos: [aviso('OUVIDO_INDISPONIVEL', {})], dados: { disponivel: false } };
  }
  const pasta = path.join(fs.statSync(arquivo).isDirectory() ? arquivo : path.dirname(arquivo), 'ouvido');
  const r = await ouvirArquivo(arquivo, modo, pasta, com);
  if (!r.ok) falha('OUVIDO_INDISPONIVEL', { detalhe: r.detalhe });
  return {
    ok: true,
    resumo: `O ouvido de som escutou (${modo}).`,
    arquivos: { saida: relativoARaiz(r.saida), texto: relativoARaiz(r.texto) },
    dados: { disponivel: true, modo },
  };
}
