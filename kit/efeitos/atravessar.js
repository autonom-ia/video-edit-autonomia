/* Zoom que atravessa o corte: no fim da cena a câmera mergulha no rosto e estoura em branco.
   A cena seguinte nasce do branco. Determinístico: só tweens e sets na linha do tempo. */
(function () {
  window.__efeito = window.__efeito || {};

  var focoDoRosto = function (pessoa) {
    var largura = Math.max(200, pessoa.direita - pessoa.esquerda);
    return {
      x: Math.max(380, Math.min(700, (pessoa.esquerda + pessoa.direita) / 2)),
      y: Math.max(900, Math.min(1350, pessoa.topo + largura * 0.95)),
    };
  };
  var aproxima = function (foco, s) {
    return { scale: s, x: (foco.x - 540) * (1 - s), y: (foco.y - 960) * (1 - s) };
  };
  var junta = function (a, b) {
    var r = {};
    Object.keys(a).forEach(function (k) { r[k] = a[k]; });
    Object.keys(b).forEach(function (k) { r[k] = b[k]; });
    return r;
  };

  var MERGULHO = 0.5; // segundos do mergulho no fim da cena

  window.__efeito.atravessar = function (tl, c) {
    var take = c.sel.take;
    var foco = focoDoRosto(c.pessoa);
    var t0 = c.inicio;
    var fim = c.fim;
    var mergulho = Math.min(MERGULHO, c.dur * 0.45);
    var m0 = fim - mergulho;

    c.frente.innerHTML =
      '<div class="at-borda"></div>' +
      '<div class="at-nucleo" style="--fx:' + foco.x + 'px;--fy:' + foco.y + 'px"></div>' +
      '<div class="at-branco"></div>';
    var f = function (sel) { return c.sel.frente + ' ' + sel; };
    tl.set([f('.at-borda'), f('.at-nucleo'), f('.at-branco')], { opacity: 0 }, t0);

    // a cena corre normal, com um zoom lento que já aponta para o rosto
    tl.fromTo(take, junta(aproxima(foco, 1), { filter: 'blur(0px) brightness(1) saturate(1)' }),
      junta(aproxima(foco, 1.07), { duration: Math.max(0.1, m0 - t0), ease: 'sine.inOut' }), t0);

    // o mergulho: acelera até 2,6x com borrão crescente e a luz subindo
    tl.to(take, junta(aproxima(foco, 2.6), { duration: mergulho, ease: 'power3.in' }), m0);
    tl.to(take, { filter: 'blur(18px) brightness(1.8) saturate(1.3)', duration: mergulho, ease: 'power2.in' }, m0);
    // as bordas esquentam na cor da marca, como lente estourando
    tl.fromTo(f('.at-borda'), { opacity: 0 }, { opacity: 1, duration: mergulho, ease: 'power2.in' }, m0);
    // o núcleo de luz abre no rosto e o branco toma o quadro no último instante
    tl.fromTo(f('.at-nucleo'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 2.6, duration: mergulho * 0.6, ease: 'power2.in' }, fim - mergulho * 0.6);
    tl.fromTo(f('.at-branco'), { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power2.in' }, fim - 0.15);
    // o clarão some junto com o corte: a próxima cena começa limpa
    tl.set(f('.at-branco'), { opacity: 0 }, fim);
  };
})();
