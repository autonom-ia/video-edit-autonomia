// Monta a pasta que o avaliador independente recebe. Nunca inclui vídeo de referência.
import fs from 'node:fs';
import path from 'node:path';
import { PASTAS } from '../lib/caminhos.mjs';
import { abrirProjeto, lerEstado, salvarEstado, lerBriefing } from '../lib/projeto.mjs';
import { escolha, inteiro } from '../lib/args.mjs';
import { lerJson, escreverJson, escreverTexto } from '../lib/json.mjs';
import { aviso } from '../lib/saida.mjs';
import { folhaDeQuadros } from '../lib/chrome.mjs';

function copiarSeExiste(origem, destino, avisos, nome) {
  if (fs.existsSync(origem)) {
    fs.copyFileSync(origem, destino);
    return true;
  }
  if (avisos) avisos.push(aviso('PACOTE_INCOMPLETO', { falta: nome }));
  return false;
}

function resumoDoBriefing(b) {
  if (!b) return {};
  return {
    nicho: b.nicho && b.nicho.descricao,
    publico: b.publico,
    oferta: b.oferta,
    cta: b.cta,
    provas: b.provas,
    tom: b.tom,
    rosto: b.rosto,
    duracao_alvo: b.duracao_alvo,
    cuidados_do_nicho: b.cuidados_do_nicho,
    palavras_proibidas: b.palavras_proibidas,
    termos_obrigatorios: b.termos_obrigatorios,
    marcas_proibidas: b.marcas_proibidas,
  };
}

export default async function pacoteRevisor({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const tipo = escolha(opcoes, 'tipo', ['premissa', 'roteiro', 'video']);
  const rodada = inteiro(opcoes, 'rodada', undefined, 1, 20);
  const pasta = projeto.arq('revisor', `${tipo}-rodada-${rodada}`);
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });
  const avisos = [];
  escreverJson(path.join(pasta, 'briefing-resumo.json'), resumoDoBriefing(lerBriefing(false)));
  copiarSeExiste(path.join(PASTAS.guias, 'regras-de-producao.md'), path.join(pasta, 'regras.md'), avisos, 'guias/regras-de-producao.md');
  copiarSeExiste(path.join(PASTAS.guias, 'regua-do-revisor.md'), path.join(pasta, 'regua.md'), avisos, 'guias/regua-do-revisor.md');
  if (tipo === 'premissa') copiarSeExiste(projeto.arq('pauta.md'), path.join(pasta, 'pauta.md'), avisos, 'pauta.md');
  if (tipo !== 'premissa') copiarSeExiste(projeto.arq('roteiro.md'), path.join(pasta, 'roteiro.md'), avisos, 'roteiro.md');
  copiarSeExiste(projeto.arq('postagem.txt'), path.join(pasta, 'legenda.txt'), null, 'postagem.txt');
  const cenas = lerJson(projeto.arq('cenas.json'), null);
  if (cenas) {
    escreverJson(path.join(pasta, 'direcao-de-arte.json'), {
      titulo_gancho: cenas.titulo_gancho,
      direcao_de_arte: cenas.direcao_de_arte || [],
      cenas: (cenas.cenas || []).map((c) => ({ id: c.id, fala: c.fala, inicio: c.inicio, fim: c.fim, rosto: c.rosto, faixa: c.faixa, zoom: c.zoom, tela: c.tela, virada: Boolean(c.virada) })),
      telas: cenas.telas || [],
      cta: cenas.cta || null,
    });
  }
  if (tipo === 'video') {
    const pastaQuadros = projeto.arq('qa', 'quadros');
    const fotos = fs.existsSync(pastaQuadros) ? fs.readdirSync(pastaQuadros).filter((n) => n.endsWith('.jpg')).sort() : [];
    if (!fotos.length) avisos.push(aviso('PACOTE_INCOMPLETO', { falta: 'qa/quadros (rode ./estudio qa antes)' }));
    for (let i = 0; i < fotos.length; i += 16) {
      const grupo = fotos.slice(i, i + 16);
      await folhaDeQuadros(grupo.map((n) => path.join(pastaQuadros, n)), path.join(pasta, `folha-de-quadros-${i / 16 + 1}.jpg`), {
        colunas: 4,
        rotulos: grupo.map((n) => `${Number(n.slice(2, 5)) - 1} s`),
      });
    }
    const t = lerJson(projeto.arq('transcricao.json'), null);
    if (t) escreverTexto(path.join(pasta, 'transcricao.txt'), `${t.palavras.map((p) => p.texto).join(' ')}\n`);
    copiarSeExiste(projeto.arq('qa', 'ouvido', 'sheet.png'), path.join(pasta, 'ouvido-folha.png'), null, 'sheet');
    copiarSeExiste(projeto.arq('qa', 'relatorio.md'), path.join(pasta, 'conferencia-tecnica.md'), null, 'qa');
  }
  if (tipo === 'roteiro' || tipo === 'video') {
    const estado = lerEstado(projeto);
    salvarEstado(projeto, { ...estado, rodadas: { ...estado.rodadas, [tipo]: rodada } });
  }
  return {
    ok: true,
    resumo: `Pacote do avaliador pronto (${tipo}, rodada ${rodada}).`,
    avisos,
    arquivos: { pacote: projeto.rel('revisor', `${tipo}-rodada-${rodada}`) },
    dados: { tipo, rodada, arquivos: fs.readdirSync(pasta).sort() },
  };
}
