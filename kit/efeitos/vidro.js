/* Vidro líquido: uma lente de vidro atravessa o quadro na frente do rosto, entortando e clareando o que está atrás.
   Com "texto", a lente passa pelo rosto e leva a frase para cima da cabeça.

   Como entorta: o backdrop-filter não enxerga o vídeo no render do HyperFrames (testado: a lente só via o
   fundo vazio da página). Então a refração é um filtro SVG aplicado no próprio #cam: um mapa de
   deslocamento neutro na tela toda, com a "lente" desenhada só onde o vidro está. O vidro da frente
   (brilho, borda, texto) e o mapa andam juntos porque os dois são gravados quadro a quadro.
   Determinístico: só tl.set e tweens, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };

  var PASSO = 1 / 60;
  var PARADA_MAIS_BAIXA = 620; // com texto, a lente não estaciona abaixo deste y (fica acima da cabeça)
  var curvas = {
    expoSai: function (u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); },
    seno: function (u) { return -(Math.cos(Math.PI * u) - 1) / 2; },
    forteDentroFora: function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    forteEntra: function (u) { return u * u * u; },
  };

  // mapa da lente: rampas vermelha (x) e verde (y) recortadas na forma de pílula; o miolo cinza
  // neutro fica quase parado, então a borda entorta mais (como vidro grosso) e o centro aumenta de leve.
  function mapa(w, h) {
    var m = Math.round(h * 0.22);
    var r = Math.round(h / 2);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + ' ' + h + "' preserveAspectRatio='none'>" +
      "<defs><linearGradient id='r'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#f00'/></linearGradient>" +
      "<linearGradient id='g' x2='0' y2='1'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#0f0'/></linearGradient>" +
      "<clipPath id='p'><rect width='" + w + "' height='" + h + "' rx='" + r + "'/></clipPath>" +
      "<filter id='b' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='" + Math.round(m * 0.6) + "'/></filter></defs>" +
      "<g clip-path='url(#p)'><rect width='" + w + "' height='" + h + "' fill='url(#r)'/>" +
      "<rect width='" + w + "' height='" + h + "' fill='url(#g)' style='mix-blend-mode:screen'/>" +
      "<rect x='" + m + "' y='" + m + "' width='" + (w - 2 * m) + "' height='" + (h - 2 * m) + "' rx='" + Math.round((h - 2 * m) / 2) + "' fill='rgb(122,122,0)' filter='url(#b)'/></g></svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // caminho em trechos: [{ ate, x, y, curva }]; devolve a posição num instante
  function posicao(trechos, inicio, t) {
    var de = inicio;
    var t0 = 0;
    for (var i = 0; i < trechos.length; i++) {
      var s = trechos[i];
      if (t <= s.ate || i === trechos.length - 1) {
        var u = Math.max(0, Math.min(1, (t - t0) / Math.max(0.001, s.ate - t0)));
        var p = curvas[s.curva](u);
        return { x: de.x + (s.x - de.x) * p, y: de.y + (s.y - de.y) * p };
      }
      de = s;
      t0 = s.ate;
    }
    return de;
  }

  window.__efeito.vidro = function (tl, c) {
    var pe = c.pessoa; // medida da cena, ou o lugar típico do kit quando pe.medida === false
    var texto = c.p.texto ? String(c.p.texto).trim() : '';
    var t0 = c.inicio, dur = c.dur;

    // tamanho: gota grande para varrer o rosto; com texto, uma placa de vidro com a frase em 1 ou 2 linhas
    var palavras = texto ? texto.split(' ').filter(Boolean) : [];
    var linhas = [texto];
    if (texto.length > 12 && palavras.length > 1) {
      // quebra no ponto que deixa as duas linhas mais parecidas
      var melhor = 1, dif = 1e9;
      for (var q = 1; q < palavras.length; q++) {
        var d = Math.abs(palavras.slice(0, q).join(' ').length - palavras.slice(q).join(' ').length);
        if (d < dif) { dif = d; melhor = q; }
      }
      linhas = [palavras.slice(0, melhor).join(' '), palavras.slice(melhor).join(' ')];
    }
    var maiorLinha = linhas.reduce(function (m, l) { return Math.max(m, l.length); }, 0);
    var fonte = texto ? Math.max(56, Math.min(112, Math.floor(590 / (maiorLinha * 0.56)))) : 0;
    var W = texto ? Math.max(420, Math.min(760, Math.round(maiorLinha * fonte * 0.56 + 150))) : 520;
    var H = texto ? Math.round(linhas.length * fonte * 1.02 + 120) : 300;

    // por onde passa: na altura dos olhos; com texto, estaciona acima da cabeça, dentro da zona segura
    var rosto = { x: Math.round((pe.esquerda + pe.direita) / 2 + 20), y: pe.topo + 410 };
    var parada = {
      x: Math.round(Math.max(60 + W / 2 - 30, Math.min(540, 850 - W / 2 + 60))),
      y: Math.round(Math.max(250 + H / 2 + 10, Math.min(PARADA_MAIS_BAIXA, pe.topo - H / 2 - 60))),
    };
    var fora = { x: 1080 + W / 2 + 60, y: rosto.y + 60 };
    var sai = Math.max(1.0, dur - 0.42);    // segundos depois do início
    var varre = !texto || dur >= 2.3;
    var trechos;
    if (!texto) {
      trechos = [
        { ate: 0.55, x: rosto.x + 150, y: rosto.y, curva: 'expoSai' },
        { ate: sai, x: rosto.x - 150, y: rosto.y + 16, curva: 'seno' },
        { ate: sai + 0.38, x: -W / 2 - 80, y: rosto.y - 30, curva: 'forteEntra' },
      ];
    } else if (varre) {
      trechos = [
        { ate: 0.55, x: rosto.x + 140, y: rosto.y, curva: 'expoSai' },
        { ate: 1.0, x: rosto.x - 100, y: rosto.y + 10, curva: 'seno' },
        { ate: 1.55, x: parada.x, y: parada.y, curva: 'forteDentroFora' },
        { ate: sai, x: parada.x - 10, y: parada.y - 12, curva: 'seno' },
        { ate: sai + 0.38, x: -W / 2 - 80, y: parada.y - 60, curva: 'forteEntra' },
      ];
    } else {
      fora = { x: 1080 + W / 2 + 60, y: parada.y + 40 };
      trechos = [
        { ate: 0.6, x: parada.x, y: parada.y, curva: 'expoSai' },
        { ate: sai, x: parada.x - 10, y: parada.y - 12, curva: 'seno' },
        { ate: sai + 0.38, x: -W / 2 - 80, y: parada.y - 60, curva: 'forteEntra' },
      ];
    }

    var idFiltro = 'ef-vidro-refr-' + c.id;
    var escala = -Math.round(Math.min(W, H) * 0.4);
    c.frente.innerHTML =
      '<svg class="vd-svg" width="0" height="0" aria-hidden="true"><filter id="' + idFiltro + '" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920" color-interpolation-filters="sRGB">' +
      '<feFlood flood-color="rgb(128,128,0)" result="neutro"/>' +
      '<feImage class="vd-mapa" href="' + mapa(W, H) + '" x="' + fora.x + '" y="' + fora.y + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none" result="lente"/>' +
      '<feMerge result="mapa"><feMergeNode in="neutro"/><feMergeNode in="lente"/></feMerge>' +
      '<feDisplacementMap in="SourceGraphic" in2="mapa" scale="' + escala + '" xChannelSelector="R" yChannelSelector="G" result="torto"/>' +
      // dentro do vidro: um pouco mais de cor e de luz
      '<feGaussianBlur class="vd-fosco" in="torto" stdDeviation="0.4" result="fosco"/>' +
      '<feColorMatrix in="fosco" type="saturate" values="1.35" result="cor"/>' +
      '<feComponentTransfer in="cor" result="claro"><feFuncR type="linear" slope="1.08" intercept="0.02"/><feFuncG type="linear" slope="1.08" intercept="0.02"/><feFuncB type="linear" slope="1.08" intercept="0.02"/></feComponentTransfer>' +
      '<feComposite in="claro" in2="lente" operator="in" result="dentro"/>' +
      '<feMerge><feMergeNode in="torto"/><feMergeNode in="dentro"/></feMerge></filter></svg>' +
      '<div class="vd-anda"><div class="vd-luz' + (texto ? '' : ' vd-luz-fraca') + '" style="width:' + Math.round(W * 0.8) + 'px;height:' + Math.round(H * 0.5) + 'px;margin:' + Math.round(H * 0.42) + 'px 0 0 ' + Math.round(-W * 0.4) + 'px"></div><div class="vd-lente' + (texto ? ' vd-com-texto' : '') + '" style="width:' + W + 'px;height:' + H + 'px;margin:' + (-H / 2) + 'px 0 0 ' + (-W / 2) + 'px">' +
      '<div class="vd-tinta"></div><div class="vd-brilho"></div><div class="vd-borda"></div><div class="vd-cor"></div>' +
      (texto ? '<div class="vd-texto" style="font-size:' + fonte + 'px">' + linhas.map(esc).join('<br>') + '</div>' : '') +
      '</div></div>';

    var anda = c.sel.frente + ' .vd-anda';
    var lente = c.sel.frente + ' .vd-lente';
    var mapaSel = c.sel.frente + ' .vd-mapa';

    // quadro a quadro: posição, e a gota estica na direção em que corre (e respira quando para)
    var fimDoCaminho = sai + 0.38;
    var total = Math.ceil(Math.min(fimDoCaminho, dur - PASSO) / PASSO);
    var antes = posicao(trechos, fora, 0);
    for (var i = 0; i <= total; i++) {
      var t = i * PASSO;
      var p = posicao(trechos, fora, t);
      var depois = posicao(trechos, fora, t + PASSO);
      var vx = Math.abs(depois.x - antes.x) / (2 * PASSO);
      var vy = Math.abs(depois.y - antes.y) / (2 * PASSO);
      antes = p;
      var kx = Math.min(0.32, vx / 9000), ky = Math.min(0.32, vy / 9000);
      var respira = 0.022 * Math.sin(t * Math.PI * 2 * 1.4);
      var sx = 1 + kx - ky * 0.55 + respira;
      var sy = 1 + ky - kx * 0.55 - respira;
      tl.set(anda, { x: p.x, y: p.y }, t0 + t);
      tl.set(lente, { scaleX: sx, scaleY: sy }, t0 + t);
      tl.set(mapaSel, { attr: { x: (p.x - W * sx / 2).toFixed(1), y: (p.y - H * sy / 2).toFixed(1), width: (W * sx).toFixed(1), height: (H * sy).toFixed(1) } }, t0 + t);
    }

    // o filtro entra no rosto só durante o efeito
    tl.set(c.sel.cam, { filter: 'url(#' + idFiltro + ')' }, t0);
    tl.set(c.sel.cam, { filter: 'none' }, Math.min(c.fim - PASSO, t0 + fimDoCaminho + PASSO));

    // reflexo corre ao contrário do movimento; o texto aparece quando a lente estaciona
    tl.fromTo(c.sel.frente + ' .vd-brilho', { x: 70 }, { x: -70, duration: sai, ease: 'sine.inOut' }, t0);
    if (texto) {
      var chega = t0 + (varre ? 1.32 : 0.32);
      // ao estacionar, o vidro fica fosco para a frase ler bem
      tl.fromTo(c.sel.frente + ' .vd-fosco', { attr: { stdDeviation: 0.4 } }, { attr: { stdDeviation: 8 }, duration: 0.4, ease: 'power2.out', immediateRender: false }, chega - 0.15);
      tl.fromTo(c.sel.frente + ' .vd-texto', { opacity: 0, y: 16, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out' }, chega);
      tl.to(c.sel.frente + ' .vd-texto', { opacity: 0, filter: 'blur(6px)', duration: 0.18, ease: 'power2.in' }, t0 + sai - 0.02);
    }
  };
})();
