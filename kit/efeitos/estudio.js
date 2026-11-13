/* Estúdio acendendo: sala escura, dois softboxes giram e acendem, placa luminosa no alto.
   Determinístico: só tweens e sets na linha do tempo, números fixos, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };

  // pisca de lâmpada ligando (opacidade, duração), lista fixa
  var PISCA = [[0.85, 0.04], [0.15, 0.05], [1, 0.05], [0.45, 0.04], [1, 0.06]];
  var APAGA = [[0.4, 0.04], [0.9, 0.04], [0, 0.08]];
  // filtro da pessoa: escuro antes, luz de contorno depois (mesma forma, para o GSAP interpolar)
  var ESCURO = 'brightness(0.38) saturate(0.7) drop-shadow(0px 0px 0px rgba(255,255,255,0)) drop-shadow(0px 0px 0px rgba(255,255,255,0))';
  var ACESO = 'brightness(1.06) saturate(1.05) drop-shadow(0px 0px 2px rgba(255,255,255,0.85)) drop-shadow(0px 0px 22px rgba(255,255,255,0.35))';

  var softbox = function (lado, x, y) {
    return '<div class="es-poste es-' + lado + '" style="left:' + (x + 140) + 'px;top:' + (y + 300) + 'px"></div>' +
      '<div class="es-caixa es-' + lado + '" style="left:' + x + 'px;top:' + y + 'px">' +
      '<div class="es-giro"><div class="es-moldura"><div class="es-difusor"></div><div class="es-acesa"></div></div></div>' +
      '</div>' +
      '<div class="es-halo es-' + lado + '" style="left:' + (x - 160) + 'px;top:' + (y - 160) + 'px"></div>';
  };

  window.__efeito.estudio = function (tl, c) {
    var P = c.pessoa;
    var placa = String(c.p.placa || 'NO AR').toUpperCase();
    var yCaixa = Math.max(420, Math.min(700, P.topo - 260));
    var xEsq = Math.max(10, Math.min(110, P.esquerda - 330));
    var xDir = Math.min(790, Math.max(P.direita + 20, 770));

    c.atras.innerHTML =
      '<div class="es-sala"><div class="es-parede"></div><div class="es-luz"></div><div class="es-chao"></div></div>' +
      '<div class="es-feixe es-esq"></div><div class="es-feixe es-dir"></div>' +
      softbox('esq', xEsq, yCaixa) + softbox('dir', xDir, yCaixa);
    c.frente.innerHTML =
      '<div class="es-placa"><i></i><span>' + esc(placa) + '</span></div>' +
      '<div class="es-vinheta"></div>';

    var t0 = c.inicio;
    var acende = t0 + 0.5;
    var placaLiga = t0 + 0.82;
    var sai = Math.max(acende + 0.5, c.fim - 0.36);
    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };
    var pisca = function (alvo, lista, t) {
      tl.to(alvo, { keyframes: lista.map(function (k) { return { opacity: k[0], duration: k[1], ease: 'none' }; }) }, t);
    };

    // corte seco para a sala escura; a pessoa entra no escuro
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.1 }, t0);
    if (c.recorte) {
      tl.set(c.recorte, { opacity: 1, filter: ESCURO }, t0);
    }
    tl.set(q('.es-acesa, .es-halo, .es-luz, .es-feixe'), { opacity: 0 }, t0);
    tl.fromTo(q('.es-sala'), { scale: 1.08 }, { scale: 1, duration: Math.max(0.8, c.dur), ease: 'power2.out' }, t0);
    // os softboxes giram para a pessoa e os postes sobem
    tl.fromTo(q('.es-esq .es-giro'), { rotationY: 88, rotationZ: 0 }, { rotationY: 34, rotationZ: 7, duration: 0.55, ease: 'expo.out' }, t0 + 0.02);
    tl.fromTo(q('.es-dir .es-giro'), { rotationY: -88, rotationZ: 0 }, { rotationY: -34, rotationZ: -7, duration: 0.55, ease: 'expo.out' }, t0 + 0.08);
    tl.fromTo(q('.es-caixa'), { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.06 }, t0);
    tl.fromTo(q('.es-poste'), { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: 'power3.out' }, t0 + 0.05);
    tl.fromTo(f('.es-placa'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, t0 + 0.12);

    // as luzes acendem com pisca de lâmpada; a sala e a pessoa clareiam junto
    pisca(q('.es-acesa'), PISCA, acende);
    pisca(q('.es-halo'), PISCA, acende);
    pisca(q('.es-feixe'), PISCA.map(function (k) { return [k[0] * 0.55, k[1]]; }), acende);
    pisca(q('.es-luz'), PISCA, acende);
    if (c.recorte) tl.to(c.recorte, { filter: ACESO, duration: 0.24, ease: 'power2.out' }, acende);
    tl.fromTo(f('.es-vinheta'), { opacity: 1 }, { opacity: 0.55, duration: 0.24 }, acende);
    // placa liga logo depois
    tl.to(f('.es-placa'), { keyframes: [{ '--liga': 1, duration: 0.04 }, { '--liga': 0.2, duration: 0.05 }, { '--liga': 1, duration: 0.06 }], ease: 'none' }, placaLiga);
    tl.to(f('.es-placa i'), { opacity: 0.25, duration: 0.25, yoyo: true, repeat: 3, ease: 'steps(1)' }, placaLiga + 0.2);
    // respiro: os softboxes ainda viram um pouco enquanto ele fala
    tl.to(q('.es-esq .es-giro'), { rotationY: 28, duration: Math.max(0.4, sai - acende - 0.55), ease: 'sine.inOut' }, t0 + 0.57);
    tl.to(q('.es-dir .es-giro'), { rotationY: -28, duration: Math.max(0.4, sai - acende - 0.55), ease: 'sine.inOut' }, t0 + 0.63);

    // saída: as luzes apagam e o quarto de verdade volta
    pisca(q('.es-acesa, .es-halo, .es-feixe, .es-luz'), APAGA, sai);
    tl.to(f('.es-placa'), { '--liga': 0, opacity: 0, duration: 0.16, ease: 'power2.in' }, sai);
    if (c.recorte) tl.to(c.recorte, { filter: ESCURO, duration: 0.16 }, sai);
    tl.to([c.sel.atras, c.sel.frente], { opacity: 0, duration: 0.14, ease: 'power2.in' }, sai + 0.18);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: 0.14, ease: 'power2.in' }, sai + 0.18);
    tl.to(c.sel.sombra, { opacity: 1, duration: 0.14 }, sai + 0.18);
    tl.set([c.sel.atras, c.sel.frente], { opacity: 1 }, c.fim);
    if (c.recorte) tl.set(c.recorte, { filter: 'none' }, c.fim);
  };
})();
