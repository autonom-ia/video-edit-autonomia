// HTML das telas fictícias genéricas (card, frase, número, lista, passos, conversa, prompt,
// notificação, pedido). Nas cores da marca do aluno, sem marca, logo ou cor de app real,
// e sem faixa de "simulação".
import { escaparHtml as e, palavras } from './texto.mjs';

const ICONES = {
  Mensagens: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-9 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="currentColor"/></svg>',
  'E-mail': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="38" height="28" rx="4" fill="currentColor"/><path d="M7 13l17 13 17-13" fill="none" stroke="var(--papel)" stroke-width="3"/></svg>',
  Agenda: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="9" width="36" height="32" rx="5" fill="currentColor"/><rect x="6" y="9" width="36" height="9" rx="4" fill="var(--tinta)" opacity=".35"/><rect x="14" y="4" width="4" height="9" rx="2" fill="currentColor"/><rect x="30" y="4" width="4" height="9" rx="2" fill="currentColor"/></svg>',
};

function iniciais(nome) {
  const ps = palavras(nome);
  const a = ps[0] ? [...ps[0]][0] : '';
  const b = ps[1] ? [...ps[1]][0] : '';
  return (a + b).toUpperCase() || '?';
}

const spansDePalavras = (texto, classe) => palavras(texto).map((p) => `<span class="${classe}">${e(p)}</span>`).join(' ');

function corpo(tela, marca) {
  const c = tela.campos || {};
  const id = e(tela.id);
  switch (tela.tipo) {
    case 'card':
      return `<div class="cartao"><div class="card-texto">${e(c.texto)}</div></div>`;
    case 'frase':
      return `<div class="cartao"><div class="frase-texto">${e(c.texto)}</div>${c.apoio ? `<div class="frase-apoio">${e(c.apoio)}</div>` : ''}</div>`;
    case 'numero':
      return `<div class="cartao centro"><div class="num-grande" id="${id}-num">${e(c.numero)}</div><div class="num-apoio">${e(c.apoio)}</div></div>`;
    case 'lista':
      return `<div class="cartao">${c.titulo ? `<div class="rotulo">${e(c.titulo)}</div>` : ''}<ol class="lista">${(c.itens || [])
        .map((it, k) => `<li class="item" id="${id}-i${k}"><i class="marca-item"></i><span>${e(it)}</span></li>`)
        .join('')}</ol></div>`;
    case 'passos': {
      const itens = c.itens || [];
      return `<div class="cartao"><div class="barra"><i id="${id}-barra"></i></div><ol class="passos">${itens
        .map((it, k) => `<li class="item${k === c.atual ? ' atual' : ''}${k < c.atual ? ' feito' : ''}" id="${id}-i${k}"><b>${k + 1}</b><span>${e(it)}</span></li>`)
        .join('')}</ol></div>`;
    }
    case 'conversa':
      return `<div class="janela-conversa"><div class="conv-topo"><span class="avatar">${e(iniciais(c.nome))}</span><span class="conv-nome"><b>${e(c.nome)}</b><small>${e(c.status)}</small></span></div><div class="conv-corpo">${(c.mensagens || [])
        .map((m, k) => `<div class="msg de-${m.de === 'eu' ? 'eu' : 'outro'} item" id="${id}-i${k}">${e(m.texto)}</div>`)
        .join('')}</div></div>`;
    case 'prompt':
      return `<div class="janela-ia"><div class="ia-topo"><i class="ia-ponto"></i><b>Assistente</b></div><div class="ia-pergunta">${spansDePalavras(c.prompt, 'pw')}</div><div class="ia-resposta">${spansDePalavras(c.resposta, 'rw')}</div></div>`;
    case 'notificacao':
      return `<div class="notif"><span class="notif-icone">${ICONES[c.app] || ICONES.Mensagens}</span><span class="notif-corpo"><span class="notif-linha"><b>${e(c.app)}</b><small>agora</small></span><span class="notif-texto">${e(c.texto)}</span></span></div>`;
    case 'cta':
      return `<div class="cartao centro">${c.frase ? `<div class="cta-frase">${e(c.frase)}</div>` : ''}<div class="cta-palavra">${e(c.palavra)}</div>${marca && marca.arroba ? `<div class="cta-arroba">${e(marca.arroba)}</div>` : ''}</div>`;
    default:
      return '';
  }
}

// tamanho: p (faixa 35 ou solta), m (faixa 50), g (faixa 100). solta: sobre o rosto (faixa 0).
// fragmento: o HTML da tela livre, já lido do arquivo do projeto.
export function htmlDaTela(tela, { tamanho = 'm', solta = false, marca = null, fragmento = '' } = {}) {
  if (tela.tipo === 'livre') return `<div class="tela tela-livre" id="tela-${e(tela.id)}" data-tela="${e(tela.id)}">${fragmento}</div>`;
  const classes = ['tela', `tela-${tela.tipo}`, `t-${tamanho}`, 'caixa'];
  if (solta) classes.push('solta');
  return `<div class="${classes.join(' ')}" id="tela-${e(tela.id)}" data-tela="${e(tela.id)}">${corpo(tela, marca)}</div>`;
}

export function itensDaTela(tela) {
  const c = tela.campos || {};
  if (tela.tipo === 'lista' || tela.tipo === 'passos') return (c.itens || []).length;
  if (tela.tipo === 'conversa') return (c.mensagens || []).length;
  return 0;
}

// Gravação de tela, vídeo de apoio ou imagem. Ocupa a faixa de ponta a ponta (ou a tela toda
// na faixa 0 e 100). O vídeo fica fora de #telas porque um <video> com tempo não pode estar
// dentro de outro elemento com tempo (regra do HyperFrames).
// src: caminho do arquivo dentro da composição. video: { inicio, duracao, trilha } ou null (imagem).
export function htmlDaMidia(tela, { alturaPx, src, video = null }) {
  const encaixe = (tela.campos && tela.campos.encaixe) === 'conter' ? 'conter' : 'cobrir';
  const id = e(tela.id);
  const altura = alturaPx > 0 ? alturaPx : 1920;
  const conteudo = video
    ? `<video id="v-${id}" class="clip midia-arquivo" src="${e(src)}" data-start="${video.inicio}" data-duration="${video.duracao}" data-track-index="${video.trilha}" muted playsinline></video>`
    : `<img class="midia-arquivo" src="${e(src)}" alt="">`;
  return `<div class="tela tela-midia midia-${encaixe}" id="tela-${id}" data-tela="${id}" style="height: ${altura}px"><div class="midia-conteudo">${conteudo}</div></div>`;
}
