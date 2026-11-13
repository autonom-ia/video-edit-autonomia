/* Recorte de papel: a pessoa vira adesivo (contorno branco) sobre uma colagem na cor da marca.
   Determinístico: só tweens e sets na linha do tempo, números fixos, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};

  // borda rasgada da folha: soma de ondas fixas (parece rasgo à mão, sempre igual)
  var borda = function (base, fase) {
    var lista = [];
    for (var k = 0; k <= 60; k++) {
      lista.push(base + 16 * Math.sin(k * 0.55 + fase) + 9 * Math.sin(k * 1.7 + 2 * fase) + 5 * Math.sin(k * 4.3 + 1 + fase));
    }
    return lista;
  };
  var RASGO = borda(40, 0);
  var RASGO_FIBRA = RASGO.map(function (v, k) { return v + 16 + 7 * Math.sin(k * 3.7); });
  // tremidinha de animação quadro a quadro (graus), lista fixa
  var TREME = [1.6, -1.2, 0.8, -1.8, 1.2, -0.6, 1.8, -1.4, 0.4, -1.0, 1.4, -1.6];
  var ALTURA = 1920;
  var FAIXA_RASGO = 100;

  var poligono = function (lista, base) {
    var passo = 1080 / (lista.length - 1);
    var pts = ['0px 0px', '1080px 0px'];
    for (var k = lista.length - 1; k >= 0; k--) pts.push(Math.round(k * passo) + 'px ' + (base + lista[k]) + 'px');
    return 'polygon(' + pts.join(',') + ')';
  };

  var estrela = function (cor) {
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var r = k % 2 ? 42 : 100;
      var a = Math.PI / 2 + (k * Math.PI) / 5;
      pts.push((100 + r * Math.cos(a)).toFixed(1) + ',' + (100 - r * Math.sin(a)).toFixed(1));
    }
    return '<svg viewBox="0 0 200 200"><polygon points="' + pts.join(' ') + '" fill="' + cor + '" stroke-linejoin="round"/></svg>';
  };

  window.__efeito.papel = function (tl, c) {
    var id = 'pp-' + c.id;
    var P = c.pessoa;
    var esq = Math.max(70, Math.min(260, P.esquerda - 250));
    var dir = Math.max(P.direita + 10, 760);
    var topoCabeca = Math.max(560, P.topo);
    var meio = Math.round((P.esquerda + P.direita) / 2);
    var raio = Math.round((P.direita - P.esquerda) / 2 + 110);

    var defs = '<svg class="pp-defs" width="0" height="0" aria-hidden="true"><defs>' +
      // contorno do adesivo: engorda a silhueta, rasga de leve a borda, pinta de branco e põe sombra
      '<filter id="' + id + '-adesivo" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="13" result="gordo"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" result="ruido"/>' +
      '<feDisplacementMap in="gordo" in2="ruido" scale="9" xChannelSelector="R" yChannelSelector="G" result="borda"/>' +
      '<feFlood flood-color="#ffffff" result="branco"/>' +
      '<feComposite in="branco" in2="borda" operator="in" result="papel"/>' +
      '<feGaussianBlur in="borda" stdDeviation="9" result="borrado"/>' +
      '<feOffset in="borrado" dx="8" dy="16" result="caida"/>' +
      '<feFlood flood-color="#000000" flood-opacity="0.38"/>' +
      '<feComposite in2="caida" operator="in" result="sombra"/>' +
      '<feMerge><feMergeNode in="sombra"/><feMergeNode in="papel"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      // fibra da borda rasgada e grão do papel (sementes fixas)
      '<filter id="' + id + '-fibra" x="-2%" y="-2%" width="104%" height="104%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" seed="7"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<filter id="' + id + '-grao" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="41" stitchTiles="stitch"/>' +
      '<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>' +
      '<feComponentTransfer><feFuncR type="linear" slope="0.6" intercept="0.62"/><feFuncG type="linear" slope="0.6" intercept="0.62"/><feFuncB type="linear" slope="0.6" intercept="0.62"/></feComponentTransfer>' +
      '</filter>' +
      '</defs></svg>';

    var forma = function (cls, x, y, w, h, giro, miolo) {
      return '<div class="pp-forma ' + cls + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px"><div class="pp-in"><div class="pp-base" style="transform:rotate(' + giro + 'deg)">' + miolo + '</div></div></div>';
    };

    var formas =
      forma('pp-faixa-escura', -80, topoCabeca + 250, 1300, 92, -13, '') +
      forma('pp-faixa-clara', -80, topoCabeca + 372, 1300, 30, -13, '') +
      forma('pp-retorno', esq - 40, topoCabeca + 140, 340, 420, 0, '') +
      forma('pp-anel', meio - raio, topoCabeca + 230 - raio, raio * 2, raio * 2, 0,
        '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="none" stroke="var(--papel)" stroke-width="5" stroke-dasharray="14 9"/></svg>') +
      forma('pp-circulo', dir - 80, 300, 300, 300, 0, '') +
      forma('pp-estrela', esq - 10, 320, 220, 220, -14, estrela('var(--destaque)')) +
      forma('pp-ponto pp-p1', esq + 30, topoCabeca + 60, 54, 54, 0, '') +
      forma('pp-ponto pp-p2', dir + 40, topoCabeca + 120, 40, 40, 0, '') +
      forma('pp-ponto pp-p3', esq + 230, 600, 30, 30, 0, '') +
      forma('pp-onda', dir - 20, topoCabeca + 420, 200, 70, -8,
        '<svg viewBox="0 0 200 70"><path d="M8 46 Q33 6 58 36 T108 36 T158 36 T196 24" fill="none" stroke="var(--destaque)" stroke-width="14" stroke-linecap="round"/></svg>');

    c.atras.innerHTML = defs +
      '<div class="pp-folha" style="height:' + (ALTURA + FAIXA_RASGO) + 'px">' +
      '<div class="pp-fibra" style="clip-path:' + poligono(RASGO_FIBRA, ALTURA) + ';filter:url(#' + id + '-fibra)"></div>' +
      '<div class="pp-cor" style="clip-path:' + poligono(RASGO, ALTURA) + ';filter:url(#' + id + '-fibra)"><div class="pp-grao" style="filter:url(#' + id + '-grao)"></div></div>' +
      '<div class="pp-formas">' + formas + '</div>' +
      '</div>';

    var t0 = c.inicio;
    var sai = Math.max(t0 + 0.9, c.fim - 0.34);
    var q = function (sel) { return c.sel.atras + ' ' + sel; };

    // entrada: a folha colorida cai de cima com a borda rasgada; a pessoa já vira adesivo
    tl.fromTo(q('.pp-folha'), { y: -(ALTURA + FAIXA_RASGO) }, { y: 0, duration: 0.3, ease: 'expo.out' }, t0);
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.15 }, t0);
    if (c.recorte) {
      tl.set(c.recorte, { opacity: 1, filter: 'url(#' + id + '-adesivo)', transformOrigin: '50% 100%' }, t0);
      tl.fromTo(c.recorte, { scale: 1.06, rotation: -1.5 }, { scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(3)' }, t0 + 0.04);
    }
    // formas de colagem entram com mola, uma depois da outra
    tl.fromTo(q('.pp-faixa-escura, .pp-faixa-clara'), { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'expo.out', stagger: 0.06 }, t0 + 0.1);
    tl.fromTo(q('.pp-anel, .pp-retorno, .pp-circulo, .pp-estrela, .pp-ponto, .pp-onda'),
      { scale: 0, rotation: function (i) { return [-60, 0, 20, -90, 0, 0, 0, 25][i] || 0; } },
      { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.05 }, t0 + 0.14);
    // respiro: a colagem chega um pouco mais perto e treme como animação de papel
    tl.fromTo(q('.pp-formas'), { scale: 1 }, { scale: 1.05, duration: Math.max(0.6, sai - t0), ease: 'none' }, t0);
    tl.fromTo(q('.pp-anel svg'), { rotation: 0 }, { rotation: 40, duration: Math.max(0.6, sai - t0), ease: 'none' }, t0);
    var passos = Math.max(2, Math.floor((sai - t0 - 0.5) / 0.125));
    tl.to(q('.pp-in'), {
      keyframes: TREME.slice(0, Math.min(TREME.length, passos)).map(function (g) { return { rotation: g, duration: 0.125, ease: 'steps(1)' }; }),
      stagger: 0.04,
    }, t0 + 0.55);

    // saída: a folha é arrancada para cima e o quarto de verdade volta
    tl.to(q('.pp-forma'), { scale: 0, duration: 0.2, ease: 'back.in(2)', stagger: 0.02 }, sai - 0.06);
    tl.to(q('.pp-folha'), { y: -(ALTURA + FAIXA_RASGO), duration: 0.3, ease: 'power3.in' }, sai);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: 0.08 }, sai + 0.24);
    tl.to(c.sel.sombra, { opacity: 1, duration: 0.2 }, sai + 0.1);
    if (c.recorte) tl.set(c.recorte, { filter: 'none', scale: 1, rotation: 0 }, c.fim);
  };
})();
