/* Quadro quebrado: o fundo trinca e estilhaça atrás da pessoa, que fica inteira por cima.
   Determinístico: os cacos saem de listas fixas de números, só tweens e sets na linha do tempo. */
(function () {
  window.__efeito = window.__efeito || {};

  var L = 1080, A = 1920;
  // listas fixas: parecem aleatórias, mas são sempre as mesmas
  var GIRO = [7, -11, 4, 13, -6, 9, -13, 3, 11, -4, 6, -9];
  var ANEL = [72, 190, 350, 580, 900, 2700];
  var TORTO = [1.0, 0.86, 1.12, 0.94, 1.18, 0.9, 1.06, 0.82, 1.14, 0.97, 0.88, 1.1, 1.03];
  var SORTE = [0.62, 0.18, 0.91, 0.37, 0.74, 0.05, 0.53, 0.84, 0.27, 0.69, 0.11, 0.46, 0.97, 0.33, 0.58, 0.22, 0.8, 0.41];
  var sorte = function (k) { return SORTE[k % SORTE.length]; };
  var raios = GIRO.length;

  var r1 = function (n) { return Math.round(n * 10) / 10; };

  // ponto do anel j no raio i, com o anel torto (cada raio tem seu desvio)
  function ponto(P, i, j) {
    var ang = ((i % raios) * (360 / raios) + GIRO[i % raios]) * Math.PI / 180;
    var r = ANEL[j] * TORTO[((i % raios) * 3 + j) % TORTO.length];
    return [P[0] + Math.cos(ang) * r, P[1] + Math.sin(ang) * r];
  }

  // os cacos: triângulos no centro, quadriláteros nos anéis do meio e triângulos (quadrilátero partido) por fora
  function cacos(P) {
    var lista = [];
    for (var i = 0; i < raios; i++) {
      lista.push([P, ponto(P, i, 0), ponto(P, i + 1, 0)]);
      for (var j = 0; j < ANEL.length - 1; j++) {
        var a = ponto(P, i, j), b = ponto(P, i + 1, j), c = ponto(P, i + 1, j + 1), d = ponto(P, i, j + 1);
        if (j < 2) lista.push([a, b, c, d]);
        else if ((i + j) % 2) { lista.push([a, b, c]); lista.push([a, c, d]); }
        else { lista.push([a, b, d]); lista.push([b, c, d]); }
      }
    }
    return lista;
  }

  window.__efeito.quebra = function (tl, c) {
    var t0 = c.inicio;
    var pes = c.pessoa;
    var largCabeca = Math.max(200, pes.direita - pes.esquerda);
    var fimCabeca = pes.topo + largCabeca * 1.45;
    var ombro = pes.topo + largCabeca * 1.3;

    // o ponto do impacto fica no fundo, do lado com mais espaço, acima da linha dos olhos
    var espEsq = pes.esquerda, espDir = L - pes.direita;
    var P = [espEsq >= espDir ? Math.max(170, pes.esquerda * 0.55) : Math.min(L - 170, pes.direita + espDir * 0.45),
      Math.max(420, Math.min(900, pes.topo - 120))];

    // textura dos cacos: o fundo sem a pessoa (vazada). Assim todo caco voa e nenhum leva pedaço do rosto.
    // Sem ele (projeto antigo), cai na foto com fundo e os cacos "da pessoa" somem no lugar.
    var fsp = c.fundoSemPessoa || null;
    var textura = fsp || c.foto;
    var daPessoa = function (cx, cy) {
      if (fsp) return false;
      var naCabeca = cx > pes.esquerda - 110 && cx < pes.direita + 110 && cy > pes.topo - 130 && cy < fimCabeca;
      return naCabeca || cy > ombro;
    };

    // poeira de vidro que fica boiando no fundo novo (posições fixas, longe do rosto)
    var POEIRA = [[120, 380, 26], [300, 610, 14], [860, 330, 22], [960, 720, 16], [180, 1040, 18], [910, 1110, 24], [520, 290, 12], [70, 760, 12], [720, 520, 10]];
    var poeira = POEIRA.map(function (d, k) {
      return '<i class="qb-po" style="left:' + d[0] + 'px;top:' + d[1] + 'px;width:' + d[2] + 'px;height:' + Math.round(d[2] * 1.4) + 'px"></i>';
    }).join('');
    var html = '<div class="qb-novo"><div class="qb-luz"></div><div class="qb-raios"></div><div class="qb-grao"></div>' + poeira + '</div><div class="qb-vidro">';
    var voam = [], ficam = [];
    cacos(P).forEach(function (pts, k) {
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.max(0, Math.min.apply(null, xs)), x1 = Math.min(L, Math.max.apply(null, xs));
      var y0 = Math.max(0, Math.min.apply(null, ys)), y1 = Math.min(A, Math.max.apply(null, ys));
      if (x1 - x0 < 2 || y1 - y0 < 2) return; // fora do quadro
      var w = x1 - x0, h = y1 - y0;
      var cx = xs.reduce(function (s, v) { return s + v; }, 0) / xs.length;
      var cy = ys.reduce(function (s, v) { return s + v; }, 0) / ys.length;
      var poly = pts.map(function (p) { return r1(p[0] - x0) + 'px ' + r1(p[1] - y0) + 'px'; }).join(',');
      var linha = pts.map(function (p) { return r1(p[0] - x0) + ',' + r1(p[1] - y0); }).join(' ');
      var pessoa = daPessoa(cx, cy);
      // sem o fundo vazado, o caco da pessoa fica transparente: mostra o take ao vivo (a foto parada mostraria a cabeça no lugar antigo)
      // brilho de vidro por cima da foto: uma faixa clara na diagonal de cada caco
      var brilho = 'linear-gradient(' + (115 + Math.round(sorte(k) * 60)) + 'deg, rgba(255,255,255,.5), rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,.28))';
      var foto = textura && !pessoa ? 'background-image:' + brilho + ',url(' + textura + ');background-size:100% 100%,1080px 1920px;' : 'background:none;';
      // a máscara (o mesmo PNG vazado) corta brilho e borda onde era a pessoa; ela anda junto com o caco
      var mascara = fsp ? 'mask-image:url(' + fsp + ');-webkit-mask-image:url(' + fsp + ');mask-size:1080px 1920px;-webkit-mask-size:1080px 1920px;' +
        'mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:' + r1(-x0) + 'px ' + r1(-y0) + 'px;-webkit-mask-position:' + r1(-x0) + 'px ' + r1(-y0) + 'px;' : '';
      html += '<div class="qb-caco" id="qb-' + c.id + '-' + k + '" style="left:' + r1(x0) + 'px;top:' + r1(y0) + 'px;width:' + r1(w) + 'px;height:' + r1(h) + 'px">' +
        '<div class="qb-gira" style="' + mascara + 'transform-origin:' + r1(cx - x0) + 'px ' + r1(cy - y0) + 'px">' +
        '<div class="qb-img' + (pessoa ? ' qb-vazio' : '') + '" style="' + foto + 'background-position:0 0,' + r1(-x0) + 'px ' + r1(-y0) + 'px;clip-path:polygon(' + poly + ')"></div>' +
        '<svg class="qb-borda" width="' + r1(w) + '" height="' + r1(h) + '"><polygon points="' + linha + '"/></svg></div></div>';
      var dx = cx - P[0], dy = cy - P[1], dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var item = { k: k, dx: dx / dist, dy: dy / dist, dist: dist };
      (pessoa ? ficam : voam).push(item);
    });
    html += '</div>';

    // as trincas: cada raio é uma linha quebrada do centro para fora, os anéis ligam os raios
    var svg = '<svg class="qb-trincas" viewBox="0 0 1080 1920" width="1080" height="1920">';
    for (var i = 0; i < raios; i++) {
      var d = 'M' + r1(P[0]) + ' ' + r1(P[1]);
      for (var j = 0; j < 5; j++) { var p = ponto(P, i, j); d += ' L' + r1(p[0]) + ' ' + r1(p[1]); }
      svg += '<path class="qb-raio" pathLength="1" d="' + d + '"/>';
      for (var a = 0; a < 4; a++) {
        if ((i + a) % 3 === 2) continue; // nem todo anel fecha: parece vidro de verdade
        var u = ponto(P, i, a), v = ponto(P, i + 1, a);
        svg += '<path class="qb-anel" pathLength="1" d="M' + r1(u[0]) + ' ' + r1(u[1]) + ' L' + r1(v[0]) + ' ' + r1(v[1]) + '"/>';
      }
    }
    svg += '</svg><div class="qb-impacto" style="left:' + r1(P[0]) + 'px;top:' + r1(P[1]) + 'px"></div>';
    c.atras.innerHTML = html + svg + '<div class="qb-clarao"></div>';

    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var caco = function (k, parte) { return '#qb-' + c.id + '-' + k + (parte ? ' ' + parte : ''); };

    // tempos: o golpe trinca; 0,3 s depois o vidro estoura; a saída limpa antes do fim
    var sai = Math.max(t0 + 1.2, c.fim - 0.32);
    var golpe = Math.max(t0 + 0.08, Math.min(c.golpe, sai - 1.05));
    var estoura = golpe + 0.3;
    var voo = Math.max(0.6, Math.min(1.05, sai - estoura - 0.05));

    // começo: a pessoa recortada aparece por cima (igual ao take); o vidro ainda não existe
    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
    tl.set([q('.qb-novo'), q('.qb-vidro'), q('.qb-trincas'), q('.qb-clarao'), q('.qb-impacto')], { opacity: 0 }, t0);
    tl.set(q('.qb-trincas path'), { strokeDasharray: 1, strokeDashoffset: 1 }, t0);

    // golpe: clarão no ponto, trincas correm para fora, o quadro treme
    tl.set([q('.qb-vidro'), q('.qb-trincas')], { opacity: 1 }, golpe);
    // o fundo novo entra em 0,16 s: nos primeiros quadros do estouro o buraco da pessoa ainda mostra o take ao vivo
    tl.to(q('.qb-novo'), { opacity: 1, duration: 0.16, ease: 'power1.in' }, estoura);
    tl.fromTo(q('.qb-impacto'), { opacity: 1, scale: 0.2 }, { opacity: 0, scale: 2.4, duration: 0.45, ease: 'expo.out' }, golpe);
    tl.fromTo(q('.qb-clarao'), { opacity: 0.55 }, { opacity: 0, duration: 0.22, ease: 'power2.out' }, golpe);
    tl.to(q('.qb-raio'), { strokeDashoffset: 0, duration: 0.24, ease: 'expo.out', stagger: 0.014 }, golpe);
    tl.to(q('.qb-anel'), { strokeDashoffset: 0, duration: 0.18, ease: 'power3.out', stagger: 0.006 }, golpe + 0.07);
    tl.to(c.sel.cam, { keyframes: { x: [0, -16, 12, -8, 5, -2, 0], rotation: [0, -0.5, 0.4, -0.25, 0.1, 0, 0], easeEach: 'none' }, duration: 0.32, ease: 'power1.out' }, golpe);
    // o vidro estufa de leve antes de estourar
    voam.forEach(function (it) {
      tl.to(caco(it.k), { x: it.dx * 6, y: it.dy * 6, duration: 0.28, ease: 'power2.out' }, golpe + 0.02);
    });

    // estoura: as trincas viram borda de caco, os cacos voam para fora e caem
    tl.to(q('.qb-trincas'), { opacity: 0, duration: 0.08 }, estoura);
    tl.fromTo(q('.qb-clarao'), { opacity: 0.5 }, { opacity: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, estoura);
    tl.to(q('.qb-borda'), { opacity: 1, duration: 0.05 }, estoura);
    voam.forEach(function (it, n) {
      var s = sorte(it.k), s2 = sorte(it.k + 7);
      var atraso = Math.min(0.16, it.dist / 2400 * 0.2);
      var longe = 240 + 760 * s;
      var t = estoura + atraso;
      tl.to(caco(it.k), { x: it.dx * longe, y: it.dy * longe, duration: voo, ease: 'power3.out' }, t);
      tl.to(caco(it.k, '.qb-gira'), {
        y: 380 + 620 * s2, rotation: (n % 2 ? 1 : -1) * (40 + 260 * s2), duration: voo, ease: 'power2.in' }, t);
      // cambalhota falsa em 2D: o caco achata e vira, como vidro girando no ar
      tl.to(caco(it.k, '.qb-gira'), { keyframes: { scaleX: [1, 0.35 + 0.3 * s, -0.5, 0.25 + 0.4 * s2], scaleY: [1, 1.12, 0.8 + 0.3 * s, 1.15], easeEach: 'sine.inOut' },
        duration: voo, ease: 'none' }, t);
      tl.to(caco(it.k), { opacity: 0, duration: voo * 0.45, ease: 'power1.in' }, t + voo * 0.55);
    });
    ficam.forEach(function (it) {
      tl.to(caco(it.k), { opacity: 0, duration: 0.14, ease: 'power1.out' }, estoura);
    });

    // fundo novo: chega com o brilho assentando e segue respirando até a saída
    tl.fromTo(q('.qb-luz'), { scale: 1.35, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out' }, estoura);
    tl.to(q('.qb-luz'), { scale: 1.08, duration: Math.max(0.3, sai - estoura - 0.9), ease: 'sine.inOut' }, estoura + 0.9);
    tl.fromTo(q('.qb-raios'), { rotation: -6, opacity: 0 }, { rotation: 8, opacity: 1, duration: Math.max(0.6, sai - estoura + 0.3), ease: 'none' }, estoura);

    tl.fromTo(q('.qb-po'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out', stagger: 0.03 }, estoura + 0.25);
    tl.to(q('.qb-po'), { y: function (k) { return -40 - 25 * (k % 3); }, rotation: function (k) { return (k % 2 ? 1 : -1) * (60 + 30 * (k % 4)); },
      duration: Math.max(0.4, sai - estoura), ease: 'none' }, estoura + 0.25);

    // saída: o fundo novo some e a pessoa volta para a sala de verdade
    tl.to(c.sel.atras, { opacity: 0, duration: 0.28, ease: 'power2.in' }, sai);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: 0.28, ease: 'power2.in' }, sai);
    tl.set(c.sel.atras, { opacity: 1 }, c.fim);
  };
})();
