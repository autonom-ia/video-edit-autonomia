// Folha de gravação para o celular: blocos em cartões grandes, lista para marcar e o guia de gravação.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KIT, PASTAS, daRaiz } from '../lib/caminhos.mjs';
import { abrirProjeto, lerMarca, lerEstado, exigirArquivo, lerBriefing } from '../lib/projeto.mjs';
import { aviso } from '../lib/saida.mjs';
import { escreverTexto, lerJson } from '../lib/json.mjs';
import { imprimirPdf } from '../lib/chrome.mjs';
import { abrir } from '../lib/abrir.mjs';
import { tokensCss, fontFaces } from '../lib/marca.mjs';
import { escaparHtml as e, preencher, linhas } from '../lib/texto.mjs';
import { medirFala } from './tempo-de-fala.mjs';

// Converte o guia (só "# ", "## ", "- " e parágrafos) em HTML.
export function guiaParaHtml(texto) {
  const saida = [];
  let lista = false;
  const fecharLista = () => {
    if (lista) saida.push('</ul>');
    lista = false;
  };
  for (const linha of linhas(texto)) {
    const t = linha.trim();
    if (!t) {
      fecharLista();
      continue;
    }
    if (t.startsWith('## ')) {
      fecharLista();
      saida.push(`<h3>${e(t.slice(3))}</h3>`);
    } else if (t.startsWith('# ')) {
      fecharLista();
      saida.push(`<h2>${e(t.slice(2))}</h2>`);
    } else if (t.startsWith('- ')) {
      if (!lista) saida.push('<ul class="marcar">');
      lista = true;
      saida.push(`<li><input type="checkbox" /><span>${e(t.slice(2))}</span></li>`);
    } else {
      fecharLista();
      saida.push(`<p>${e(t)}</p>`);
    }
  }
  fecharLista();
  return saida.join('\n');
}

function checklist(briefing) {
  const itens = ['Bateria carregada e celular no modo avião.', 'Lente do celular limpa.', 'Luz no rosto, sem janela atrás de você.', 'Silêncio em volta (TV e ventilador desligados).'];
  const mic = briefing && briefing.gravacao && briefing.gravacao.microfone;
  if (mic === 'lapela') itens.push('Microfone de lapela preso no peito, a um palmo da boca.');
  else if (mic === 'fone_com_fio') itens.push('Fone com fio ligado, microfone perto da boca sem encostar na roupa.');
  else itens.push('Fique perto do celular: a um braço de distância.');
  return itens.map((t) => `        <li><input type="checkbox" /><span>${e(t)}</span></li>`).join('\n');
}

export default async function folha({ opcoes }) {
  const projeto = abrirProjeto(opcoes);
  const marca = lerMarca();
  const estado = lerEstado(projeto);
  const roteiro = fs.readFileSync(exigirArquivo(projeto.arq('roteiro.md')), 'utf8');
  const fala = medirFala(roteiro);
  const cenas = lerJson(projeto.arq('cenas.json'), null);
  const avisos = [];
  const blocos = fala.blocos
    .map((b, i) => {
      const dica = i === 0 ? 'Gancho: grave 3 vezes, com energia, olhando para a lente.' : cenas && cenas.cenas && cenas.cenas[i] && cenas.cenas[i].virada ? 'Virada: fale mais firme aqui.' : '';
      return `      <div class="bloco${i === 0 ? ' gancho' : ''}"><div class="n">Bloco ${i + 1} · uns ${b.segundos} s</div><div class="fala">${e(b.texto)}</div>${dica ? `<div class="dica">${e(dica)}</div>` : ''}</div>`;
    })
    .join('\n');
  const arqGuia = path.join(PASTAS.guias, 'guia-de-gravacao.md');
  let guia = '';
  if (fs.existsSync(arqGuia)) guia = guiaParaHtml(fs.readFileSync(arqGuia, 'utf8'));
  else avisos.push(aviso('GUIA_FALTA', { arquivo: 'guias/guia-de-gravacao.md' }));
  const molde = fs.readFileSync(path.join(KIT, 'molde', 'folha-de-gravacao.tpl.html'), 'utf8');
  const urlDe = (rel) => pathToFileURL(daRaiz(rel)).href;
  const html = preencher(molde, {
    TITULO: e(estado.titulo || projeto.nome),
    FONTES: fontFaces(marca, urlDe),
    TOKENS: tokensCss(marca),
    SEGUNDOS: String(Math.round(fala.segundos)),
    BLOCOS: blocos,
    CHECKLIST: checklist(lerBriefing(false)),
    GUIA: guia,
  });
  const arqHtml = projeto.arq('folha-de-gravacao.html');
  escreverTexto(arqHtml, html);
  const arqPdf = projeto.arq('folha-de-gravacao.pdf');
  await imprimirPdf(arqHtml, arqPdf);
  abrir(arqPdf);
  return {
    ok: true,
    resumo: 'Folha de gravação pronta e aberta.',
    avisos,
    arquivos: { html: projeto.rel('folha-de-gravacao.html'), pdf: projeto.rel('folha-de-gravacao.pdf') },
    dados: { blocos: fala.blocos.length, segundos: fala.segundos },
  };
}
