/* Órbita de ícones: pastilhas giram numa elipse em volta da cabeça, por trás e pela frente.
   Cada ícone existe duas vezes, um na camada de trás (por baixo do recorte) e outro na da frente,
   com a mesma trajetória em keyframes. Na metade de cima da volta ele está na frente; na de baixo,
   passa atrás da cabeça. A troca é um set de opacidade no instante do cruzamento.
   Determinístico: a trajetória é calculada uma vez, ao carregar, e vira keyframes fixos. */
(function () {
  window.__efeito = window.__efeito || {};

  // Ícones em traço (viewBox 24x24, cor do texto da pastilha).
  var ICONES = {
    microfone: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/>',
    legenda: '<rect x="2.5" y="5" width="19" height="14" rx="3.5"/><path d="M10.5 10.2h-2a1.6 1.6 0 0 0-1.6 1.6v.4a1.6 1.6 0 0 0 1.6 1.6h2M17.2 10.2h-2a1.6 1.6 0 0 0-1.6 1.6v.4a1.6 1.6 0 0 0 1.6 1.6h2"/>',
    play: '<path d="M8 5.2v13.6L19 12z" fill="currentColor"/>',
    tesoura: '<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.3 8.2L20 18.5M8.3 15.8L20 5.5"/>',
    texto: '<path d="M4.5 7V4.5h15V7M12 4.5v15M9 19.5h6"/>',
    estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    raio: '<path d="M13.5 2.5L4.5 14h7l-1 7.5 9-11.5h-7z"/>',
    check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
    grafico: '<path d="M3 20.5h18M6.5 17v-4M11.5 17V8.5M16.5 17V4.5"/>',
    mensagem: '<path d="M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5L4 20.5v-15a1 1 0 0 1 0 0z"/><path d="M8 9.5h8M8 12.5h5"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 2.8v4M16 2.8v4"/>',
    dinheiro: '<path d="M12 2.5v19M16.8 6.8c-.9-1.4-2.7-2.1-4.8-2.1-2.6 0-4.5 1.3-4.5 3.3 0 4.6 9.8 2.4 9.8 7.2 0 2-2 3.4-5 3.4-2.3 0-4.3-.8-5.2-2.4"/>',
    casa: '<path d="M3 11L12 3.8 21 11M5.5 9.2V20.5h13V9.2M10 20.5v-6h4v6"/>',
    carro: '<path d="M3.5 16.5v-4l2.2-5.5h12.6l2.2 5.5v4zM3.5 12.5h17"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
    coracao: '<path d="M12 20.2s-7.6-4.6-9-9.3C2 7.4 4.1 4.5 7.3 4.5c2 0 3.6 1.2 4.7 3 1.1-1.8 2.7-3 4.7-3 3.2 0 5.3 2.9 4.3 6.4-1.4 4.7-9 9.3-9 9.3z"/>',
    escudo: '<path d="M12 2.8l8 3v6.1c0 5-3.5 8.2-8 9.3-4.5-1.1-8-4.3-8-9.3V5.8z"/><path d="M8.5 12l2.6 2.6 4.6-5"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7.2 8-7.2s8 2.8 8 7.2"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.6 2.2"/>'
  };
  var PADRAO = ['play', 'tesoura', 'legenda', 'microfone', 'estrela'];
  // Quatro estilos de pastilha, em rodízio (cores da marca).
  var ESTILOS = ['ob-a', 'ob-b', 'ob-c', 'ob-d'];

  // brilhos da entrada: ângulo no anel (graus, 180-360 = arco da frente), afastamento e tamanho
  var BRILHOS = [[196, 1.12, 46], [238, 0.9, 30], [272, 1.18, 54], [305, 0.94, 34], [338, 1.1, 44], [12, 1.2, 28], [160, 1.16, 32]];
  var ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 0C12.9 8.6 15.4 11.1 24 12 15.4 12.9 12.9 15.4 12 24 11.1 15.4 8.6 12.9 0 12 8.6 11.1 11.1 8.6 12 0z"/></svg>';

  var VOLTAS = 1.5;
  var FPS = 30;
  var ENTRADA = 0.6; // segundos até o raio assentar
  var SAIDA = 0.34; // segundos da saída, antes do fim da cena

  function expoOut(u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); }
  function quadIn(u) { return u * u; }
  // gira rápido na entrada e assenta numa velocidade de cruzeiro
  function progresso(u) { return 0.55 * u + 0.45 * (1 - Math.pow(1 - u, 3)); }

  function pastilha(nome, estilo) {
    return '<div class="ob-pos"><div class="ob-pop"><div class="ob-pastilha ' + estilo + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nome] + '</svg></div></div></div>';
  }

  function trilho(g, metade) {
    // metade "frente" = arco de cima; "atras" = arco de baixo
    var corte = metade === 'frente'
      ? '<rect x="0" y="0" width="1080" height="' + g.cy.toFixed(1) + '"/>'
      : '<rect x="0" y="' + g.cy.toFixed(1) + '" width="1080" height="' + (1920 - g.cy).toFixed(1) + '"/>';
    var id = 'ob-corte-' + g.id + '-' + metade;
    return '<div class="ob-trilho"><svg viewBox="0 0 1080 1920" width="1080" height="1920">' +
      '<defs><clipPath id="' + id + '">' + corte + '</clipPath></defs>' +
      '<g transform="rotate(' + g.giro + ' ' + g.cx.toFixed(1) + ' ' + g.cy.toFixed(1) + ')"><ellipse class="ob-linha" clip-path="url(#' + id + ')" cx="' + g.cx.toFixed(1) + '" cy="' + g.cy.toFixed(1) +
      '" rx="' + g.rx.toFixed(1) + '" ry="' + g.ry.toFixed(1) + '"/></g></svg></div>';
  }

  // Trilha da cabeça (c.pessoa.trilha, a cada 0,5 s): devolve [{ t, topo, cx }] limpa e suavizada.
  // Quando a mão entra no recorte, a largura medida estoura; aí vale o lado que mudou menos.
  function trilhaDaCabeca(pes) {
    var pts = Array.isArray(pes.trilha) && pes.trilha.length ? pes.trilha : [{ t: 0, topo: pes.topo, esquerda: pes.esquerda, direita: pes.direita }];
    var larguras = pts.map(function (q) { return q.direita - q.esquerda; }).sort(function (a, b) { return a - b; });
    var normal = larguras[Math.floor(larguras.length / 2)];
    var cru = [];
    pts.forEach(function (q, i) {
      var centro = (q.esquerda + q.direita) / 2;
      if (q.direita - q.esquerda > normal * 1.18 && i > 0) {
        var antes = cru[i - 1].cx;
        var peloEsq = q.esquerda + normal / 2, peloDir = q.direita - normal / 2;
        centro = Math.abs(peloEsq - antes) < Math.abs(peloDir - antes) ? peloEsq : peloDir;
      }
      cru.push({ t: q.t, topo: q.topo, cx: centro });
    });
    return cru.map(function (q, i) {
      var a = cru[Math.max(0, i - 1)], b = cru[Math.min(cru.length - 1, i + 1)];
      return { t: q.t, topo: (a.topo + 2 * q.topo + b.topo) / 4, cx: (a.cx + 2 * q.cx + b.cx) / 4 };
    });
  }

  window.__efeito.orbita = function (tl, c) {
    var p = c.p || {};
    var nomes = (Array.isArray(p.icones) ? p.icones : []).filter(function (n) { return ICONES[n]; }).slice(0, 6);
    if (nomes.length < 3) nomes = PADRAO.slice();
    var n = nomes.length;

    // Geometria: elipse em volta da cabeça. Vista de baixo, como um anel acima dos olhos:
    // o arco da frente passa por cima do boné, o de trás some atrás da testa.
    var pes = c.pessoa;
    var cabeca = trilhaDaCabeca(pes);
    var cx = cabeca[0].cx;
    var largura = pes.direita - pes.esquerda;
    var g = {
      id: c.id,
      cx: cx,
      cy: cabeca[0].topo + 110,
      rx: Math.max(330, Math.min(440, largura / 2 + 185, cx - 100, 980 - cx)),
      ry: 200,
      giro: -7 // graus: o anel fica um pouco inclinado, mais natural que reto
    };
    var cosG = Math.cos(g.giro * Math.PI / 180), senG = Math.sin(g.giro * Math.PI / 180);

    c.atras.innerHTML = '<div class="ob-palco">' + trilho(g, 'atras') + nomes.map(function (nm, k) { return pastilha(nm, ESTILOS[k % 4]); }).join('') + '</div>';
    var brilhos = BRILHOS.map(function (b, k) {
      var a = b[0] * Math.PI / 180, lx = g.rx * b[1] * Math.cos(a), ly = g.ry * b[1] * Math.sin(a);
      var x = g.cx + lx * cosG - ly * senG, y = g.cy + lx * senG + ly * cosG;
      return '<div class="ob-brilho' + (k % 2 ? ' ob-brilho-b' : '') + '" style="left:' + (x - b[2] / 2).toFixed(1) + 'px;top:' + (y - b[2] / 2).toFixed(1) + 'px;width:' + b[2] + 'px;height:' + b[2] + 'px">' + ESTRELA + '</div>';
    }).join('');
    c.frente.innerHTML = '<div class="ob-palco">' + trilho(g, 'frente') + nomes.map(function (nm, k) { return pastilha(nm, ESTILOS[k % 4]); }).join('') + brilhos + '</div>';

    var t0 = c.inicio;
    var tFim = c.fim - 0.04;
    var dur = Math.max(0.5, tFim - t0);
    var saida = Math.min(SAIDA, dur * 0.25);
    var passos = Math.max(12, Math.ceil(dur * FPS));
    var giro = VOLTAS * Math.PI * 2;
    var atrasPos = c.atras.querySelectorAll('.ob-pos');
    var frentePos = c.frente.querySelectorAll('.ob-pos');

    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);

    for (var k = 0; k < n; k++) {
      var fase = Math.PI + (k / n) * Math.PI * 2; // k = 0 começa na esquerda, entrando pela frente
      var xs = [], ys = [], ss = [], rs = [], senos = [], tempos = [];
      for (var i = 0; i <= passos; i++) {
        var u = i / passos;
        var t = u * dur;
        var th = fase + giro * progresso(u);
        // o raio abre na entrada e estoura um pouco na saída
        var raio = 0.32 + 0.68 * expoOut(Math.min(1, t / ENTRADA));
        if (t > dur - saida) raio *= 1 + 0.32 * quadIn((t - (dur - saida)) / saida);
        var sen = Math.sin(th), cos = Math.cos(th);
        var lx = g.rx * raio * cos, ly = g.ry * raio * sen;
        xs.push(+(g.cx + lx * cosG - ly * senG).toFixed(2));
        ys.push(+(g.cy + lx * senG + ly * cosG).toFixed(2));
        ss.push(+(0.86 - 0.22 * sen).toFixed(4)); // na frente (seno < 0) fica maior
        rs.push(+(cos * 18).toFixed(2)); // a pastilha vira um pouco, como se acompanhasse o anel
        senos.push(sen);
        tempos.push(t0 + t);
      }
      var alvo = [atrasPos[k], frentePos[k]];
      tl.set(alvo, { transformPerspective: 700, x: xs[0], y: ys[0], scale: ss[0], rotationY: rs[0] }, t0);
      tl.to(alvo, { keyframes: { x: xs, y: ys, scale: ss, rotationY: rs, easeEach: 'none' }, duration: dur, ease: 'none' }, t0);

      // quem aparece: frente no arco de cima, trás no de baixo
      var naFrente = senos[0] < 0;
      tl.set(frentePos[k], { opacity: naFrente ? 1 : 0 }, t0);
      tl.set(atrasPos[k], { opacity: naFrente ? 0 : 1 }, t0);
      for (var j = 1; j <= passos; j++) {
        var agora = senos[j] < 0;
        if (agora === naFrente) continue;
        // instante do cruzamento por interpolação linear entre as duas amostras
        var a = senos[j - 1], b = senos[j];
        var tc = tempos[j - 1] + (tempos[j] - tempos[j - 1]) * (a / (a - b));
        tl.set(frentePos[k], { opacity: agora ? 1 : 0 }, tc);
        tl.set(atrasPos[k], { opacity: agora ? 0 : 1 }, tc);
        naFrente = agora;
      }
    }

    // entrada: as pastilhas nascem do zero, uma atrás da outra; saída: encolhem antes do fim
    var pops = [c.sel.atras + ' .ob-pop', c.sel.frente + ' .ob-pop'];
    tl.fromTo(pops, { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)', stagger: { each: 0.06, grid: [2, n], axis: 1 } }, t0);
    tl.to(pops, { scale: 0, duration: saida * 0.9, ease: 'power2.in', stagger: { each: 0.025, grid: [2, n], axis: 1 } }, tFim - saida);

    // o anel inteiro acompanha a cabeça pela trilha, com folga para não sair do quadro
    var palcos = [c.sel.atras + ' .ob-palco', c.sel.frente + ' .ob-palco'];
    var desloca = function (q) {
      return { x: Math.max(80 + g.rx - g.cx, Math.min(1000 - g.rx - g.cx, q.cx - g.cx)), y: q.topo - cabeca[0].topo };
    };
    tl.set(palcos, desloca(cabeca[0]), t0);
    for (var m = 1; m < cabeca.length && cabeca[m - 1].t < dur; m++) {
      var de = cabeca[m - 1].t, ate = Math.min(dur, cabeca[m].t);
      tl.to(palcos, Object.assign(desloca(cabeca[m]), { duration: Math.max(0.05, ate - de), ease: 'sine.inOut' }), t0 + de);
    }

    // brilhos acendem e apagam em sequência na entrada (bate com o som de cintilar)
    var bsel = c.sel.frente + ' .ob-brilho';
    tl.fromTo(bsel, { scale: 0, rotation: -60, opacity: 1 }, { scale: 1, rotation: 0, duration: 0.18, ease: 'back.out(3)', stagger: 0.055 }, t0 + 0.08);
    tl.to(bsel, { scale: 0, rotation: 45, duration: 0.26, ease: 'power2.in', stagger: 0.055 }, t0 + 0.27);

    // o trilho tracejado abre junto com o raio, corre devagar e some na saída
    var trilhos = [c.sel.atras + ' .ob-trilho', c.sel.frente + ' .ob-trilho'];
    var origem = g.cx.toFixed(1) + 'px ' + g.cy.toFixed(1) + 'px';
    tl.fromTo(trilhos, { scale: 0.32, opacity: 0, transformOrigin: origem }, { scale: 1, opacity: 1, duration: ENTRADA, ease: 'expo.out' }, t0);
    tl.fromTo([c.sel.atras + ' .ob-linha', c.sel.frente + ' .ob-linha'], { strokeDashoffset: 0 }, { strokeDashoffset: -160, duration: dur, ease: 'none' }, t0);
    tl.to(trilhos, { scale: 1.3, opacity: 0, duration: saida, ease: 'power2.in' }, tFim - saida);
  };
})();
