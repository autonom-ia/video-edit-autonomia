// Busca e baixa opções de trilha grátis (CC0 ou CC BY) que ainda não foram usadas.
// --acrescentar: guarda as opções que já existem e numera as novas depois delas
// (sem ele, a busca começa do zero e apaga as opções e versões anteriores).
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS } from '../lib/caminhos.mjs';
import { abrirProjeto, lerBriefing } from '../lib/projeto.mjs';
import { inteiro } from '../lib/args.mjs';
import { lerJson } from '../lib/json.mjs';
import { falha, aviso } from '../lib/saida.mjs';
import { buscarMusicas, baixarMusica } from '../lib/openverse.mjs';
import { progresso } from '../lib/executar.mjs';

const BUSCA_POR_TOM = {
  calmo: 'calm acoustic background',
  animado: 'upbeat positive',
  divertido: 'happy playful',
  direto: 'minimal beat',
};

function idsUsados(projeto) {
  const usados = new Set(lerJson(path.join(PASTAS.marca, 'musicas-usadas.json'), []).map((m) => String(m.id)));
  const pasta = projeto.arq('trilha');
  if (fs.existsSync(pasta)) {
    for (const n of fs.readdirSync(pasta)) {
      if (n.startsWith('opcao-') && n.endsWith('.json')) usados.add(String(lerJson(path.join(pasta, n), {}).id));
    }
  }
  return usados;
}

function opcoesExistentes(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((n) => n.startsWith('opcao-') && n.endsWith('.mp3'))
    .map((n) => Number(n.slice('opcao-'.length, -'.mp3'.length)))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

export default async function musica({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const acrescentar = opcoes.acrescentar === true;
  const quantas = inteiro(opcoes, 'quantas', 3, 1, 5);
  const briefing = lerBriefing(false);
  const termos = typeof opcoes.busca === 'string' && opcoes.busca.trim() ? opcoes.busca.trim() : BUSCA_POR_TOM[(briefing && briefing.tom) || 'calmo'] || BUSCA_POR_TOM.calmo;
  const excluir = idsUsados(projeto);
  const escolhidas = [];
  for (let pagina = 1; pagina <= 3 && escolhidas.length < quantas; pagina += 1) {
    const achadas = await buscarMusicas(termos, { pagina, excluir });
    for (const item of achadas) {
      if (escolhidas.length >= quantas) break;
      if (escolhidas.some((e) => String(e.id) === String(item.id))) continue;
      escolhidas.push(item);
    }
  }
  if (!escolhidas.length) falha('SEM_MUSICA_BOA', { busca: termos });
  const pasta = projeto.arq('trilha');
  fs.mkdirSync(pasta, { recursive: true });
  if (!acrescentar) {
    for (const n of fs.readdirSync(pasta)) {
      if (n.startsWith('opcao-') || n.startsWith('variante-') || n === 'variantes.json') fs.rmSync(path.join(pasta, n), { force: true });
    }
  }
  const existentes = acrescentar ? opcoesExistentes(pasta) : [];
  const primeiro = existentes.length ? existentes[existentes.length - 1] + 1 : 1;
  const opcoesBaixadas = [];
  for (const [i, item] of escolhidas.entries()) {
    const n = primeiro + i;
    progresso(`Baixando a música ${i + 1} de ${escolhidas.length}...`);
    const ficha = await baixarMusica(item, path.join(pasta, `opcao-${n}.mp3`), path.join(pasta, `opcao-${n}.json`));
    opcoesBaixadas.push({ opcao: n, titulo: ficha.titulo, autor: ficha.autor, licenca: ficha.licenca, duracao_s: ficha.duracao_s, etiquetas: ficha.etiquetas, descricao: ficha.descricao });
  }
  const avisos = escolhidas.length < quantas ? [aviso('POUCAS_MUSICAS', { achadas: escolhidas.length, pedidas: quantas })] : [];
  return {
    ok: true,
    resumo: acrescentar ? `Acrescentei ${escolhidas.length} opção(ões) de música às ${existentes.length} que já havia.` : `Baixei ${escolhidas.length} opção(ões) de música.`,
    avisos,
    arquivos: { pasta: projeto.rel('trilha') },
    dados: { busca: termos, acrescentou: acrescentar, ja_existiam: existentes, opcoes: opcoesBaixadas },
  };
}
