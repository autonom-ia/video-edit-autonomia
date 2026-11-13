/* Curva de crescimento: painel escuro atrás da pessoa, curva que sobe e contador em degraus.
   Determinístico: a curva e os degraus saem de contas fixas, só tweens e sets na linha do tempo.
   O campo "origem" (de onde vem o número) é regra do kit e nunca aparece na tela. */
(function () {
  window.__efeito = window.__efeito || {};
  // escapa para texto e para atributo (aspas também): o que o aluno escreve nunca vira HTML
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  // tremidinha fixa da curva (um gráfico de verdade não é liso)
  var TREME = [0, 0.6, -0.4, 0.9, -0.7, 0.3, 1, -0.5, 0.4, -0.9, 0.7, -0.2, 0.5, -0.6, 0.2, 0];

  // arredonda antes de separar inteiro e decimal: 2,99 com uma casa vira 3,0 (não 2,0)
  function formata(v, casas) {
    var neg = v < 0; v = Math.abs(v);
    var decimos = Math.round(v * (casas ? 10 : 1));
    var inteiro = casas ? Math.floor(decimos / 10) : decimos;
    // ponto a cada três dígitos, da direita para a esquerda (1.250)
    var dig = String(inteiro), txt = '';
    for (var i = 0; i < dig.length; i++) txt += (i && (dig.length - i) % 3 === 0 ? '.' : '') + dig[i];
    if (casas) txt += ',' + String(decimos % 10);
    return (neg && decimos ? '-' : '') + txt;
  }

  // pontos da curva, refeitos em passos de mesmo comprimento: a ponta anda junto com o traço
  function curva(x0, y0, x1, y1, n) {
    var densos = [];
    var K = 2.3;
    for (var i = 0; i <= 240; i++) {
      var u = i / 240;
      var sobe = (Math.exp(K * u) - 1) / (Math.exp(K) - 1);
      var k = u * (TREME.length - 1), a = Math.floor(k), b = Math.min(TREME.length - 1, a + 1);
      var tr = TREME[a] + (TREME[b] - TREME[a]) * (k - a);
      densos.push([x0 + (x1 - x0) * u, y0 - (y0 - y1) * sobe + tr * 16 * Math.sin(Math.PI * u)]);
    }
    var acum = [0];
    for (var j = 1; j < densos.length; j++) {
      var dx = densos[j][0] - densos[j - 1][0], dy = densos[j][1] - densos[j - 1][1];
      acum.push(acum[j - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var total = acum[acum.length - 1], pts = [], m = 0;
    for (var s = 0; s <= n; s++) {
      var alvo = total * s / n;
      while (m < acum.length - 2 && acum[m + 1] < alvo) m++;
      var f = (alvo - acum[m]) / ((acum[m + 1] - acum[m]) || 1);
      pts.push([densos[m][0] + (densos[m + 1][0] - densos[m][0]) * f, densos[m][1] + (densos[m + 1][1] - densos[m][1]) * f]);
    }
    return pts;
  }

  window.__efeito.grafico = function (tl, c) {
    var p = c.p;
    var de = Number(p.de) || 0, ate = Number(p.ate) || 0;
    var casas = (de % 1 || ate % 1) ? 1 : 0;
    var t0 = c.inicio;
    // o número final chega sempre 1,2 s depois do início: é onde a ficha põe o "pop" (o som bate na chegada)
    var CHEGADA = 1.2;
    var desenha = t0 + 0.18;
    var chega = t0 + CHEGADA;
    var sai = Math.max(chega + 0.1, c.fim - 0.3);
    var dura = chega - desenha;

    // a ponta fica à direita, acima da cabeça; o contador fica à esquerda, no alto
    var pontaX = 820, pontaY = Math.max(520, Math.min(760, c.pessoa.topo - 170));
    var base = 1260;
    var pts = curva(-40, base, pontaX, pontaY, 48);
    var linha = pts.map(function (q, i) { return (i ? 'L' : 'M') + r1(q[0]) + ' ' + r1(q[1]); }).join(' ');
    var area = linha + ' L' + pontaX + ' 1920 L-40 1920 Z';

    // degraus do contador, presos à altura da ponta: o número sobe junto com a curva.
    // altura(a) = quanto a ponta já subiu (0 a 1) na fração a do desenho (mesma curva de tempo do traço)
    var suave = function (a) { return a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2; };
    var altura = function (a) {
      var i = Math.min(pts.length - 1, Math.round(suave(a) * (pts.length - 1))), h = 0;
      for (var j = 0; j <= i; j++) h = Math.max(h, (base - pts[j][1]) / (base - pontaY));
      return Math.min(1, h);
    };
    var inteirosCurtos = !casas && Math.abs(ate - de) <= 12;
    var n = inteirosCurtos ? Math.abs(ate - de) + 1 : 10;
    var degraus = [], quando = [];
    for (var k = 0; k < n; k++) {
      var alvo = n > 1 ? k / (n - 1) : 1, a = 0;
      if (inteirosCurtos) {
        // o degrau k entra quando a ponta passa da fração k da altura
        while (a < 1 && altura(a) < alvo - 1e-6) a += 0.01;
        degraus.push(de + (ate > de ? k : -k));
      } else {
        // 10 degraus em tempos iguais, cada um com o valor da altura da ponta naquele instante
        a = alvo;
        degraus.push(de + (ate - de) * altura(a));
      }
      quando.push(k === n - 1 ? 1 : Math.min(1, a));
    }
    degraus[n - 1] = ate;
    // cada degrau leva o próprio sufixo, colado no número (número curto não deixa buraco)
    var suf = p.sufixo ? '<span class="gf-suf">' + esc(p.sufixo) + '</span>' : '';
    var nums = degraus.map(function (v, k) { return '<span class="gf-n" id="gf-' + c.id + '-n' + k + '">' + esc(formata(v, casas)) + suf + '</span>'; }).join('');
    // o número maior cabe na zona segura (até x=850): a fonte encolhe para número comprido
    var maior = formata(ate, casas).length > formata(de, casas).length ? formata(ate, casas) : formata(de, casas);
    var largSuf = p.sufixo ? String(p.sufixo).length * 36 + 18 : 0;
    var fonte = Math.max(110, Math.min(200, Math.floor((740 - largSuf) / (0.6 * maior.length))));

    c.atras.innerHTML =
      '<div class="gf-painel"><div class="gf-brilho"></div><div class="gf-grade"></div></div>' +
      '<svg class="gf-svg gf-area" viewBox="0 0 1080 1920" width="1080" height="1920">' +
      '<defs><linearGradient id="gf-' + c.id + '-g" x1="0" y1="' + pontaY + '" x2="0" y2="' + (base + 200) + '" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" class="gf-g1"/><stop offset="1" class="gf-g2"/></linearGradient></defs>' +
      '<path fill="url(#gf-' + c.id + '-g)" d="' + area + '"/></svg>' +
      '<svg class="gf-svg" viewBox="0 0 1080 1920" width="1080" height="1920">' +
      '<path class="gf-base" pathLength="1" d="M60 ' + base + ' L1020 ' + base + '"/>' +
      '<path class="gf-halo" pathLength="1" d="' + linha + '"/>' +
      '<path class="gf-linha" pathLength="1" d="' + linha + '"/></svg>' +
      '<div class="gf-ponto"><i class="gf-onda"></i><i class="gf-miolo"></i></div>';
    c.frente.innerHTML =
      '<div class="gf-placar">' +
      (p.rotulo ? '<div class="gf-rotulo">' + esc(p.rotulo) + '</div>' : '') +
      '<div class="gf-valor"><span class="gf-nums" style="font-size:' + fonte + 'px">' + nums + '</span></div>' +
      '<div class="gf-traco"></div></div>';

    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };

    // entrada: o painel escurece o fundo, a grade assenta, a pessoa recortada fica por cima
    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
    tl.fromTo(q('.gf-painel'), { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' }, t0);
    tl.fromTo(q('.gf-grade'), { scale: 1.12 }, { scale: 1, duration: 0.7, ease: 'expo.out' }, t0);
    tl.fromTo(q('.gf-grade'), { backgroundPosition: '0px 0px' }, { backgroundPosition: '-60px 60px', duration: sai - t0, ease: 'none' }, t0);
    tl.fromTo(q('.gf-brilho'), { opacity: 0.3, scale: 0.8 }, { opacity: 1, scale: 1, duration: dura + 0.2, ease: 'power2.in' }, t0);

    // a curva sobe: traço, área e ponta andam juntos
    tl.set(q('.gf-linha, .gf-halo'), { strokeDasharray: 1, strokeDashoffset: 1 }, t0);
    tl.to(q('.gf-linha, .gf-halo'), { strokeDashoffset: 0, duration: dura, ease: 'power2.inOut' }, desenha);
    tl.set(q('.gf-area'), { clipPath: 'inset(0px 1120px 0px 0px)' }, t0);
    tl.fromTo(q('.gf-base'), { opacity: 0, strokeDashoffset: 0.1 }, { opacity: 1, strokeDashoffset: 0, duration: 0.6, ease: 'power3.out' }, t0 + 0.05);
    tl.to(q('.gf-area'), {
      keyframes: { clipPath: pts.map(function (pt) { return 'inset(0px ' + r1(1080 - pt[0]) + 'px 0px 0px)'; }), easeEach: 'none' },
      duration: dura, ease: 'power2.inOut' }, desenha);
    tl.fromTo(q('.gf-ponto'), { x: pts[0][0], y: pts[0][1], opacity: 0 }, { opacity: 1, duration: 0.15 }, t0 + 0.1);
    tl.to(q('.gf-ponto'), { keyframes: { x: pts.map(function (pt) { return r1(pt[0]); }), y: pts.map(function (pt) { return r1(pt[1]); }), easeEach: 'none' },
      duration: dura, ease: 'power2.inOut' }, desenha);

    // contador em degraus: cada degrau troca o número com um pulo curto
    tl.fromTo(f('.gf-placar'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, t0 + 0.08);
    tl.fromTo(f('.gf-traco'), { scaleX: 0 }, { scaleX: 1, duration: dura, ease: 'power2.inOut' }, desenha);
    tl.set(f('.gf-n'), { opacity: 0 }, t0);
    degraus.forEach(function (v, k) {
      var t = desenha + dura * quando[k];
      var id = '#gf-' + c.id + '-n' + k;
      if (k > 0) tl.set('#gf-' + c.id + '-n' + (k - 1), { opacity: 0 }, t);
      tl.set(id, { opacity: 1 }, t);
      tl.fromTo(f('.gf-nums'), { y: 10, scale: 1.06 }, { y: 0, scale: 1, duration: 0.14, ease: 'power3.out', immediateRender: false }, t);
    });

    // chegada: o número final dá um soco, a ponta solta ondas e o painel respira até a saída
    tl.fromTo(f('.gf-valor'), { scale: 1 }, { keyframes: { scale: [1, 1.14, 0.98, 1], easeEach: 'power2.out' }, duration: 0.42 }, chega);
    tl.fromTo(q('.gf-miolo'), { scale: 1 }, { keyframes: { scale: [1, 1.9, 1.2], easeEach: 'power2.out' }, duration: 0.4 }, chega);
    var ondas = Math.max(1, Math.floor((sai - chega) / 0.7));
    tl.fromTo(q('.gf-onda'), { scale: 0.5, opacity: 0.9 }, { scale: 3, opacity: 0, duration: 0.7, ease: 'power2.out', repeat: ondas - 1 }, chega);
    tl.to(q('.gf-ponto'), { y: '-=14', duration: Math.max(0.3, sai - chega), ease: 'sine.inOut' }, chega + 0.05);
    tl.to(f('.gf-placar'), { y: -8, duration: Math.max(0.3, sai - chega), ease: 'sine.inOut' }, chega + 0.4);

    // saída: painel e placar somem, a pessoa volta para a sala de verdade
    var saida = Math.max(0.12, Math.min(0.26, c.fim - sai - 0.02));
    tl.to([c.sel.atras, c.sel.frente], { opacity: 0, duration: saida, ease: 'power2.in' }, sai);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: saida, ease: 'power2.in' }, sai);
    tl.set([c.sel.atras, c.sel.frente], { opacity: 1 }, c.fim);
  };
  // exposto para o teste do kit conferir o número que vai para a tela
  window.__efeito.grafico.formata = formata;
})();
