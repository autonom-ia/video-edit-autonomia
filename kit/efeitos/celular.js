/* Dentro do celular: o take encolhe para a tela de um celular desenhado, com interface de Reels genérica.
   Determinístico: só tweens e sets na linha do tempo, nada de callback.
   O celular fica na camada "atras" (dentro do #cam), então encolhe e gira junto com o take.
   O corpo do aparelho é SVG: no render do HyperFrames, canto redondo e sombra em elemento do tamanho do
   quadro não aparecem, e o corte do vídeo não aceita canto redondo. A moldura do SVG cobre os cantos do take. */
(function () {
  window.__efeito = window.__efeito || {};
  // escapa para texto e para atributo (aspas também): o que o aluno escreve nunca vira HTML
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); };

  // tela do celular, em px do quadro (antes de encolher)
  var TELA = { x: 130, y: 70, w: 820, h: 1780, r: 112 };
  var CORPO = { x: 100, y: 40, w: 880, h: 1840, r: 142 };
  var ESCALA = 0.5;

  var rr = function (b) {
    var x = b.x, y = b.y, w = b.w, h = b.h, r = b.r;
    return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
      'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
      'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
      'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';
  };
  var icone = function (d, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + (extra || '') + '</svg>';
  };
  var CORACAO = '<path d="M12 20.5s-7.6-4.6-9.4-9.3C1.2 7.7 3.6 4.6 6.9 4.6c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.3 0 5.7 3.1 4.3 6.6-1.8 4.7-9.4 9.3-9.4 9.3z"/>';

  window.__efeito.celular = function (tl, c) {
    var t0 = c.inicio;
    var dur = c.dur;
    var nome = String(c.marca.arroba || c.marca.nome || 'seu perfil');
    var inicial = (String(c.marca.nome || nome).replace('@', '').trim().charAt(0) || 'R').toUpperCase();
    var rotulo = c.p.rotulo ? String(c.p.rotulo) : '';

    c.fundo.innerHTML = '<div class="cl-base"></div><div class="cl-luz"></div><div class="cl-chao"></div>';

    var corpo = '<svg class="cl-corpo" viewBox="0 0 1080 1920" width="1080" height="1920">' +
      '<defs><linearGradient id="cl-g-' + c.id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#3a3a3e"/><stop offset=".45" stop-color="#121214"/><stop offset="1" stop-color="#050506"/></linearGradient>' +
      '<linearGradient id="cl-a-' + c.id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#b9bcc2"/><stop offset=".5" stop-color="#45474c"/><stop offset="1" stop-color="#8c8f95"/></linearGradient></defs>' +
      '<rect x="92" y="420" width="10" height="120" rx="4" fill="#2c2d30"/><rect x="92" y="580" width="10" height="200" rx="4" fill="#2c2d30"/>' +
      '<rect x="978" y="520" width="10" height="260" rx="4" fill="#2c2d30"/>' +
      '<path fill-rule="evenodd" fill="url(#cl-g-' + c.id + ')" d="' + rr(CORPO) + rr(TELA) + '"/>' +
      '<path fill="none" stroke="url(#cl-a-' + c.id + ')" stroke-width="5" d="' + rr({ x: CORPO.x + 2, y: CORPO.y + 2, w: CORPO.w - 4, h: CORPO.h - 4, r: CORPO.r - 2 }) + '"/>' +
      '<path fill="none" stroke="rgba(255,255,255,.10)" stroke-width="2" d="' + rr({ x: TELA.x - 1, y: TELA.y - 1, w: TELA.w + 2, h: TELA.h + 2, r: TELA.r + 1 }) + '"/>' +
      '<rect class="cl-ilha" x="462" y="96" width="156" height="46" rx="23" fill="#000"/>' +
      '</svg>';

    var ui =
      '<div class="cl-sombra-baixo"></div>' +
      '<div class="cl-ui cl-topo"><b>Reels</b>' + icone('<rect x="3" y="6.5" width="18" height="13" rx="3.5"/><circle cx="12" cy="13" r="3.6"/><path d="M8.5 6.5 10 4h4l1.5 2.5"/>') + '</div>' +
      '<div class="cl-ui cl-acoes">' +
      '<div class="cl-acao cl-curtir">' + icone(CORACAO) + '<svg class="cl-cheio" viewBox="0 0 24 24">' + CORACAO.replace('<path ', '<path fill="currentColor" ') + '</svg></div>' +
      '<div class="cl-acao">' + icone('<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.6a8.4 8.4 0 1 1 15.5-4.3z"/>') + '</div>' +
      '<div class="cl-acao">' + icone('<path d="M21.5 3 10 14.5"/><path d="M21.5 3 14.6 21l-4.6-6.5L3 9.9z"/>') + '</div>' +
      '<div class="cl-acao">' + icone('<circle cx="5.5" cy="12" r="1.3" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#fff"/><circle cx="18.5" cy="12" r="1.3" fill="#fff"/>') + '</div>' +
      '</div>' +
      '<div class="cl-ui cl-perfil"><span class="cl-avatar">' + esc(inicial) + '</span><b>' + esc(nome) + '</b><span class="cl-seguir">Seguir</span></div>' +
      '<div class="cl-ui cl-audio">' + icone('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>') + '<span>Áudio original</span></div>' +
      '<div class="cl-barra"><i></i></div>' +
      '<div class="cl-coracao-grande"><svg viewBox="0 0 24 24">' + CORACAO.replace('<path ', '<path fill="#fff" ') + '</svg></div>';
    c.atras.innerHTML = ui + corpo;

    if (rotulo) {
      var palavras = rotulo.split(' ').filter(Boolean).map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(' ');
      c.frente.innerHTML = '<div class="cl-rotulo"><div class="cl-rotulo-txt">' + palavras + '</div><i class="cl-traco"></i></div>';
    }

    var a = function (sel) { return c.sel.atras + ' ' + sel; };
    var q = function (sel) { return c.sel.fundo + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };
    // corte do take: retângulo com os cantos chanfrados, para o canto reto não sair para fora do aparelho
    var poli = function (l, t, r, b, k) {
      var R = 1080 - r, B = 1920 - b;
      return 'polygon(' + [[l, t + k], [l + k, t], [R - k, t], [R, t + k], [R, B - k], [R - k, B], [l + k, B], [l, B - k]]
        .map(function (p) { return p[0] + 'px ' + p[1] + 'px'; }).join(', ') + ')';
    };
    var corteTela = poli(TELA.x, TELA.y, 1080 - TELA.x - TELA.w, 1920 - TELA.y - TELA.h, 40);
    var corteCheio = poli(0, 0, 0, 0, 0);

    // tempos (encolhem em cena curta)
    var entra = Math.min(0.6, dur * 0.25);
    var sai = Math.max(t0 + entra + 0.4, c.fim - Math.min(0.55, dur * 0.22));
    var volta = c.fim - sai;
    var fica = sai - (t0 + entra);
    var bate = Math.min(t0 + 0.8, sai - 0.35);

    // 1. entra: o take encolhe para a tela; o aparelho aparece em volta, em leve 3D
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.2 }, t0);
    tl.fromTo(q('.cl-luz'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, t0);
    tl.fromTo(q('.cl-luz'), { rotation: -10 }, { rotation: 14, duration: Math.max(0.6, dur), ease: 'none' }, t0);
    tl.fromTo(q('.cl-chao'), { opacity: 0, scaleX: 0.5 }, { opacity: 1, scaleX: 1, duration: entra, ease: 'expo.out' }, t0 + entra * 0.3);
    tl.fromTo(c.sel.cam,
      { scale: 1, rotation: 0, rotationY: 0, rotationX: 0, y: 0, transformPerspective: 2200 },
      { scale: ESCALA, rotation: -2, rotationY: 16, rotationX: 5, y: -78, duration: entra, ease: 'expo.out' }, t0);
    tl.fromTo(c.sel.take, { clipPath: corteCheio }, { clipPath: corteTela, duration: entra * 0.7, ease: 'expo.out' }, t0);
    tl.fromTo(a('.cl-corpo'), { opacity: 0 }, { opacity: 1, duration: entra * 0.45, ease: 'power2.out' }, t0);
    tl.fromTo(a('.cl-ui'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 }, t0 + entra * 0.6);
    tl.fromTo(a('.cl-sombra-baixo'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t0 + entra * 0.5);
    tl.fromTo(a('.cl-barra i'), { scaleX: 0.08 }, { scaleX: 0.9, duration: Math.max(0.5, sai - t0), ease: 'none' }, t0);

    // 2. fica: o celular flutua e vira devagar para o outro lado
    tl.to(c.sel.cam, { rotationY: -10, rotationX: 2, rotation: 1.5, y: -90, scale: ESCALA + 0.01, duration: Math.max(0.3, fica), ease: 'sine.inOut' }, t0 + entra);

    // a curtida: coração da direita enche e um coração grande pisca no meio da tela
    tl.fromTo(a('.cl-cheio'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(3)' }, bate);
    tl.fromTo(a('.cl-coracao-grande'), { scale: 0.2, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.32, ease: 'back.out(2.4)' }, bate);
    tl.to(a('.cl-coracao-grande'), { scale: 1.15, opacity: 0, y: -60, duration: 0.4, ease: 'power2.in' }, bate + 0.45);

    // rótulo opcional, em cima do aparelho
    if (rotulo) {
      tl.fromTo(f('.cl-rotulo-txt span'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out', stagger: 0.07 }, t0 + entra * 0.5);
      tl.fromTo(f('.cl-traco'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, t0 + entra * 0.5 + 0.15);
      tl.to(f('.cl-rotulo'), { opacity: 0, y: -20, duration: 0.25, ease: 'power2.in' }, sai);
    }

    // 3. sai: a interface some e o take cresce de volta para a tela cheia
    tl.to(a('.cl-ui, .cl-sombra-baixo, .cl-barra'), { opacity: 0, duration: 0.18, ease: 'power2.in' }, sai);
    tl.to(c.sel.cam, { scale: 1, rotation: 0, rotationY: 0, rotationX: 0, y: 0, duration: volta, ease: 'power3.inOut' }, sai);
    tl.to(c.sel.take, { clipPath: corteCheio, duration: volta, ease: 'power3.inOut' }, sai);
    tl.to(a('.cl-corpo'), { opacity: 0, duration: volta * 0.4, ease: 'power2.in' }, sai + volta * 0.05);
    tl.to(q('.cl-chao, .cl-luz'), { opacity: 0, duration: volta }, sai);
    tl.to(c.sel.sombra, { opacity: 1, duration: volta * 0.4 }, sai + volta * 0.6);

    // o motor não devolve estes: deixa tudo como estava
    tl.set(c.sel.cam, { y: 0, rotationY: 0, rotationX: 0, transformPerspective: 0 }, c.fim);
    tl.set(c.sel.take, { clipPath: 'none' }, c.fim);
  };
})();
