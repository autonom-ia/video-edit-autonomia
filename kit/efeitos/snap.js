/* Zoom-relâmpago: a câmera dá um tranco no rosto na palavra de ênfase, assenta e volta suave.
   Determinístico: só tweens e sets na linha do tempo, nada de callback. O tremor sai de uma lista fixa. */
(function () {
  window.__efeito = window.__efeito || {};

  // ponto do rosto (olhos e nariz), a partir do topo e das laterais da cabeça
  var focoDoRosto = function (pessoa) {
    var largura = Math.max(200, pessoa.direita - pessoa.esquerda);
    return {
      x: Math.max(380, Math.min(700, (pessoa.esquerda + pessoa.direita) / 2)),
      y: Math.max(900, Math.min(1350, pessoa.topo + largura * 0.95)),
    };
  };
  // escala e deslocamento do vídeo para aproximar mantendo o rosto parado no quadro
  var aproxima = function (foco, s) {
    return { scale: s, x: (foco.x - 540) * (1 - s), y: (foco.y - 960) * (1 - s) };
  };
  var junta = function (a, b) {
    var r = {};
    Object.keys(a).forEach(function (k) { r[k] = a[k]; });
    Object.keys(b).forEach(function (k) { r[k] = b[k]; });
    return r;
  };

  // tremor que morre: deslocamento em % do vídeo (1% = ~11 px na largura)
  var TREMOR = [[0.9, -0.5], [-0.7, 0.6], [0.5, -0.3], [-0.3, 0.25], [0.15, -0.1], [0, 0]];

  window.__efeito.snap = function (tl, c) {
    var take = c.sel.take;
    var foco = focoDoRosto(c.pessoa);
    var t0 = c.inicio;
    var fim = c.fim;
    // o tranco precisa de espaço antes (antecipação) e depois (assentar e voltar)
    var g = Math.max(t0 + 0.12, Math.min(c.golpe, fim - 1.0));

    c.frente.innerHTML =
      '<div class="sn-vinheta"></div>' +
      '<div class="sn-flash" style="--fx:' + foco.x + 'px;--fy:' + foco.y + 'px"></div>' +
      '<div class="sn-luz"></div>';
    var f = function (sel) { return c.sel.frente + ' ' + sel; };

    // antes do golpe: deriva lenta, a câmera "respira"
    tl.fromTo(take, aproxima(foco, 1), junta(aproxima(foco, 1.025), { duration: Math.max(0.1, g - 0.08 - t0), ease: 'sine.inOut' }), t0);
    tl.set(take, { filter: 'blur(0px) brightness(1) saturate(1)' }, t0);
    tl.set([f('.sn-vinheta'), f('.sn-flash'), f('.sn-luz')], { opacity: 0 }, t0);

    // antecipação: recua um fio antes do tranco
    tl.to(take, junta(aproxima(foco, 0.995), { duration: 0.08, ease: 'power2.in' }), g - 0.08);
    // o tranco: 1,3x em ~0,16 s, com borrão e um estouro de luz
    tl.to(take, junta(aproxima(foco, 1.3), { duration: 0.16, ease: 'expo.out' }), g);
    tl.to(take, { keyframes: [
      { filter: 'blur(12px) brightness(1.3) saturate(1.15)', duration: 0.033, ease: 'none' },
      { filter: 'blur(0px) brightness(1) saturate(1)', duration: 0.12, ease: 'power2.out' },
    ] }, g);
    tl.fromTo(f('.sn-flash'), { opacity: 0 }, { keyframes: [
      { opacity: 0.55, duration: 0.033, ease: 'none' },
      { opacity: 0, duration: 0.16, ease: 'power2.out' },
    ] }, g);
    // um vazamento de luz na cor da marca cruza o canto e apaga
    tl.fromTo(f('.sn-luz'), { opacity: 0, xPercent: -18, yPercent: -10 }, { keyframes: [
      { opacity: 1, xPercent: -6, yPercent: -4, duration: 0.07, ease: 'power2.out' },
      { opacity: 0, xPercent: 8, yPercent: 4, duration: 0.45, ease: 'power2.out' },
    ] }, g);
    // tranco de câmera: tremor curto que morre
    TREMOR.forEach(function (d, k) {
      tl.to(take, { xPercent: d[0], yPercent: d[1], duration: 0.045, ease: 'sine.inOut' }, g + 0.1 + k * 0.045);
    });

    // assenta em 1,12x e a vinheta escurece as bordas (o olho fica no rosto)
    var assenta = g + 0.16;
    tl.to(take, junta(aproxima(foco, 1.12), { duration: 0.55, ease: 'power3.out' }), assenta);
    tl.to(f('.sn-vinheta'), { opacity: 1, duration: 0.4, ease: 'power2.out' }, g);

    // volta a 1x suave até o fim da cena
    var volta = assenta + 0.6;
    var sai = Math.max(volta + 0.2, fim - 0.04);
    tl.to(take, junta(aproxima(foco, 1), { duration: sai - volta, ease: 'sine.inOut' }), volta);
    tl.to(f('.sn-vinheta'), { opacity: 0, duration: Math.max(0.2, sai - volta), ease: 'sine.inOut' }, volta);
    tl.set(take, { xPercent: 0, yPercent: 0 }, fim);
  };
})();
