/* Cartão inclinado: o vídeo vira um cartão com borda branca e, no golpe, a cabeça escapa por cima.
   Determinístico: só tweens e sets na linha do tempo, nada de callback.
   Como funciona: tudo isto fica dentro do #cam, então encolhe e gira junto, alinhado.
   - antes do golpe: o take inteiro é o cartão; a borda branca são quatro barras por cima das beiradas;
   - no golpe: o take é cortado (clip-path) da borda de cima para baixo e a pessoa recortada fica por cima,
     sem esse corte: a cabeça fica fora do cartão.
   No render do HyperFrames, canto redondo (round) no corte do vídeo e borda/sombra num elemento do tamanho
   do quadro não aparecem; por isso o cartão tem canto reto e a borda são barras. */
(function () {
  window.__efeito = window.__efeito || {};

  var BORDA = 28;       // borda branca (px do quadro, antes de encolher)
  var ESCALA = 0.78;
  var GIRO = -6;

  window.__efeito['cartao-inclinado'] = function (tl, c) {
    var t0 = c.inicio;
    var dur = c.dur;
    var podeEscapar = !!c.recorte;
    var corte = function (topo) { return 'inset(' + topo + 'px 0.1px 0.2px 0.3px)'; };
    // a borda de cima do cartão desce até o queixo: a cabeça (altura ~2x a largura) fica de fora
    var largura = Math.max(300, c.pessoa.direita - c.pessoa.esquerda);
    var escape = Math.round(Math.min(1660, Math.max(c.pessoa.topo + 450, c.pessoa.topo + largura * 1.95)));

    c.fundo.innerHTML = '<div class="ci-base"></div><div class="ci-brilho"></div><div class="ci-luz"></div><div class="ci-grao"></div>';
    c.atras.innerHTML = '<div class="ci-reflexo"></div>' +
      '<div class="ci-moldura">' +
      '<i class="ci-b ci-cima" style="height:' + BORDA + 'px"></i><i class="ci-b ci-baixo" style="height:' + BORDA + 'px"></i>' +
      '<i class="ci-b ci-esq" style="width:' + BORDA + 'px"></i><i class="ci-b ci-dir" style="width:' + BORDA + 'px"></i></div>';

    var q = function (sel) { return c.sel.fundo + ' ' + sel; };
    var a = function (sel) { return c.sel.atras + ' ' + sel; };
    var sombra0 = 'drop-shadow(0px 0px 0px rgba(0,0,0,0))';
    var sombra1 = 'drop-shadow(0px 40px 46px rgba(0,0,0,0.6))';

    // tempos: entra, escapa no golpe, volta antes do fim (encolhem juntos em cena curta)
    var entra = Math.min(0.5, dur * 0.22);
    var sai = Math.max(t0 + entra + 0.35, c.fim - Math.min(0.5, dur * 0.2));
    var volta = c.fim - sai;
    var escapa = Math.min(Math.max(c.golpe, t0 + entra * 0.8), sai - 0.5);
    var desce = 0.42;

    // 1. o rosto encolhe e gira, vira cartão; o fundo escuro aparece por trás
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.2 }, t0);
    tl.fromTo(q('.ci-brilho'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, t0);
    tl.fromTo(q('.ci-brilho'), { rotation: 0 }, { rotation: 18, duration: Math.max(0.6, dur), ease: 'none' }, t0);
    tl.fromTo(q('.ci-luz'), { xPercent: -30, yPercent: 10, opacity: 0 }, { xPercent: 20, yPercent: -12, opacity: 0.45, duration: Math.max(0.6, dur), ease: 'sine.inOut' }, t0);
    tl.fromTo(c.sel.cam,
      { scale: 1, rotation: 0, y: 0, filter: sombra0 },
      { scale: ESCALA, rotation: GIRO, y: -70, filter: sombra1, duration: entra, ease: 'expo.out' }, t0);
    tl.fromTo(a('.ci-moldura'), { opacity: 0 }, { opacity: 1, duration: entra * 0.7, ease: 'power2.out' }, t0);
    // um reflexo de luz atravessa o cartão quando ele assenta
    tl.fromTo(a('.ci-reflexo'), { xPercent: -120, opacity: 1 }, { xPercent: 120, duration: 0.7, ease: 'power2.inOut' }, t0 + entra * 0.4);
    tl.set(a('.ci-reflexo'), { opacity: 0 }, t0 + entra * 0.4 + 0.7);
    // respiro: o cartão deriva devagar enquanto espera o golpe
    tl.to(c.sel.cam, { rotation: GIRO + 1.4, scale: ESCALA - 0.012, duration: Math.max(0.2, escapa - t0 - entra), ease: 'sine.inOut' }, t0 + entra);

    // 2. golpe: a borda de cima desce até o queixo; o take é cortado ali e a pessoa recortada fica inteira
    //    por cima, então a cabeça sai do cartão. Os quatro números do corte são diferentes porque o
    //    navegador encurta "inset(0px 0px 0px 0px)" e o tween de clipPath quebra (limite do render,
    //    registrado em guias/camadas.md, "Efeitos de cena", item 6).
    if (podeEscapar) {
      tl.set(c.recorte, { opacity: 1, clipPath: 'inset(0.4px ' + BORDA + 'px ' + (BORDA + 0.2) + 'px ' + (BORDA + 0.1) + 'px)' }, escapa);
      tl.fromTo(c.sel.take, { clipPath: corte(0.4) }, { clipPath: corte(escape), duration: desce, ease: 'power3.inOut' }, escapa);
      tl.to(a('.ci-moldura'), { top: escape, duration: desce, ease: 'power3.inOut' }, escapa);
    }
    // o cartão vira para o outro lado e assenta, como no tranco de quem sai da foto
    tl.to(c.sel.cam, { rotation: GIRO + 9, scale: ESCALA + 0.03, y: -40, duration: desce, ease: 'power3.inOut' }, escapa);
    tl.to(c.sel.cam, { rotation: GIRO + 7.6, scale: ESCALA + 0.018, duration: Math.max(0.2, sai - escapa - desce), ease: 'sine.inOut' }, escapa + desce);

    // 3. saída: a borda sobe, o cartão desgira e volta a tela cheia
    if (podeEscapar) {
      tl.to(c.sel.take, { clipPath: corte(0.4), duration: volta * 0.7, ease: 'power3.inOut' }, sai);
      tl.to(a('.ci-moldura'), { top: 0, duration: volta * 0.7, ease: 'power3.inOut' }, sai);
      tl.set(c.recorte, { opacity: 0 }, sai + volta * 0.7);
    }
    tl.to(a('.ci-moldura'), { opacity: 0, duration: volta * 0.5, ease: 'power2.in' }, sai + volta * 0.5);
    tl.to(c.sel.cam, { scale: 1, rotation: 0, y: 0, filter: sombra0, duration: volta, ease: 'power3.inOut' }, sai);
    tl.to(c.sel.sombra, { opacity: 1, duration: volta * 0.45 }, sai + volta * 0.55);
    tl.to(q('.ci-brilho'), { opacity: 0, duration: volta }, sai);

    // o motor não devolve estes: deixa tudo como estava
    tl.set(c.sel.cam, { y: 0 }, c.fim);
    tl.set(c.sel.take, { clipPath: 'none' }, c.fim);
    if (podeEscapar) tl.set(c.recorte, { clipPath: 'none' }, c.fim);
  };
})();
