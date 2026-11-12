// Músicas grátis no Openverse: só CC0 e CC BY (nada NC/ND), sem chave.
import fs from 'node:fs';
import { falha } from './saida.mjs';
import { MUSICA } from './regras.mjs';

const API = 'https://api.openverse.org/v1/audio/';
const UA = 'estudio-de-reels/1.0';

async function chamar(url) {
  let resposta;
  try {
    resposta = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  } catch (erro) {
    falha('REDE_FALHOU', { detalhe: String(erro && erro.message) });
  }
  if (resposta.status === 429) falha('LIMITE_OPENVERSE', {});
  if (!resposta.ok) falha('REDE_FALHOU', { detalhe: `Openverse respondeu ${resposta.status}` });
  return resposta;
}

export function licencaAceita(item) {
  return MUSICA.licencas.includes(String(item.license || '').toLowerCase());
}

export function duracaoAceita(item) {
  const s = Number(item.duration || 0) / 1000;
  return s >= MUSICA.duracaoMinS && s <= MUSICA.duracaoMaxS;
}

export async function buscarMusicas(termos, { pagina = 1, excluir = new Set() } = {}) {
  const params = new URLSearchParams({
    q: termos,
    license: MUSICA.licencas.join(','),
    category: 'music',
    page_size: '20',
    page: String(pagina),
  });
  const dados = await (await chamar(`${API}?${params}`)).json();
  const resultados = Array.isArray(dados.results) ? dados.results : [];
  return resultados.filter((r) => licencaAceita(r) && duracaoAceita(r) && r.url && !excluir.has(String(r.id)));
}

export function textoDeCredito(item) {
  const lic = String(item.license || '').toLowerCase();
  const versao = item.license_version ? ` ${item.license_version}` : '';
  const pagina = item.foreign_landing_url || item.url || '';
  if (lic === 'by') return `Trilha: "${item.title}", de ${item.creator} (${pagina}), licença CC BY${versao}.`;
  return `Trilha: "${item.title}", de ${item.creator} (${pagina}), domínio público (CC0).`;
}

// Etiquetas que o próprio Openverse traz (no máximo 3, sem repetir). Nada é inventado.
export function etiquetasDoItem(item, maximo = 3) {
  const lista = [];
  for (const t of Array.isArray(item && item.tags) ? item.tags : []) {
    const nome = String((t && t.name) || '').trim().toLowerCase();
    if (nome && !lista.includes(nome)) lista.push(nome);
    if (lista.length >= maximo) break;
  }
  return lista;
}

// Descrição da música só com o título e as etiquetas do Openverse. O assistente não ouve a música,
// então não pode descrever o som ("piano calmo que cresce") por conta própria.
export function descricaoDaMusica({ titulo, etiquetas }) {
  const nome = String(titulo || '').trim() || 'sem título';
  const tags = Array.isArray(etiquetas) && etiquetas.length ? `, etiquetas: ${etiquetas.join(', ')}` : '';
  return `"${nome}"${tags}, licença livre`;
}

export async function baixarMusica(item, destinoMp3, destinoJson) {
  const resposta = await chamar(item.url);
  const audio = Buffer.from(await resposta.arrayBuffer());
  fs.writeFileSync(destinoMp3, audio);
  const ficha = {
    id: String(item.id),
    titulo: item.title || '',
    autor: item.creator || '',
    licenca: `CC ${String(item.license).toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}`,
    licenca_url: item.license_url || '',
    url: item.foreign_landing_url || item.url || '',
    duracao_s: Math.round(Number(item.duration || 0) / 100) / 10,
    exige_credito: String(item.license).toLowerCase() === 'by',
    texto_credito: textoDeCredito(item),
    etiquetas: etiquetasDoItem(item),
  };
  ficha.descricao = descricaoDaMusica(ficha);
  fs.writeFileSync(destinoJson, `${JSON.stringify(ficha, null, 2)}\n`, 'utf8');
  return ficha;
}
