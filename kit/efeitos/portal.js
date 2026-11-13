/* Zoom portal: o rosto nasce numa bolha redonda sobre fundo escuro e a bolha cresce até tomar a tela.
   Determinístico: a bolha é calculada quadro a quadro (60 por segundo) e gravada com tl.set,
   para o anel, o recorte e o zoom andarem juntos sem callback. */
(function () {
  window.__efeito = window.__efeito || {};

  var PASSO = 1 / 60;          // uma amostra a cada 1/60 s (o vídeo tem 30 quadros por segundo)
  var RAIO = 130;              // bolha de 260 px de diâmetro
  var ORIGEM = { x: 540, y: 960 }; // transform-origin do #cam (estilo do molde)
  var ESCALA_BOLHA = 0.4;     // o rosto dentro da bolha
  var ESCALA_FINAL = 1.07;     // leve zoom quando a bolha fecha a tela
  // fases, em segundos depois do início da cena
  var NASCE = 0.3, ESPERA = 0.58, FECHA = 1.18, ASSENTA = 0.4;

  var mistura = function (a, b, p) { return a + (b - a) * p; };
  var molaSaida = function (u) { var s = 1.6, k = s + 1; return 1 + k * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
  var suaveDentroFora = function (u) { return u < 0.5 ? 8 * Math.pow(u, 4) : 1 - Math.pow(-2 * u + 2, 4) / 2; };

  window.__efeito.portal = function (tl, c) {
    var t0 = c.inicio;
    var pe = c.pessoa; // medida da cena, ou o lugar típico do kit quando pe.medida === false
    // centro do rosto no quadro (nariz): metade da cabeça, um pouco abaixo dos olhos
    var rosto = { x: Math.round((pe.esquerda + pe.direita) / 2 + 30), y: pe.topo + 500 };
    // a bolha nasce do lado com mais espaço, acima do ombro, dentro da zona segura
    var ladoEsquerdo = pe.esquerda >= 1080 - pe.direita;
    var bolha = { x: ladoEsquerdo ? 250 : 700, y: 680 };
    var bolhaAlta = { x: bolha.x, y: bolha.y - 10 };
    // onde o rosto termina na tela com o zoom final
    var destino = { x: ORIGEM.x + ESCALA_FINAL * (rosto.x - ORIGEM.x), y: ORIGEM.y + ESCALA_FINAL * (rosto.y - ORIGEM.y) };
    var raioFinal = Math.ceil(Math.max(
      Math.hypot(destino.x, destino.y), Math.hypot(1080 - destino.x, destino.y),
      Math.hypot(destino.x, 1920 - destino.y), Math.hypot(1080 - destino.x, 1920 - destino.y)) + 30);

    c.fundo.innerHTML = '<div class="pt-ceu" style="--bx:' + bolha.x + 'px;--by:' + bolha.y + 'px"></div>' +
      '<div class="pt-eco" style="left:' + bolha.x + 'px;top:' + bolha.y + 'px"></div>' +
      '<div class="pt-eco" style="left:' + bolha.x + 'px;top:' + bolha.y + 'px"></div>' +
      '<div class="pt-eco" style="left:' + bolha.x + 'px;top:' + bolha.y + 'px"></div>';
    c.frente.innerHTML = '<div class="pt-anel"><div class="pt-arco"></div></div><div class="pt-clarao" style="--dx:' + Math.round(destino.x) + 'px;--dy:' + Math.round(destino.y) + 'px"></div>';

    // estado da bolha num instante t (segundos depois do início)
    var estado = function (t) {
      if (t < NASCE) {
        var u = t / NASCE;
        return { r: Math.max(0, RAIO * molaSaida(u)), k: ESCALA_BOLHA, x: bolha.x, y: bolha.y, borra: 0, anel: Math.min(1, u * 3) };
      }
      if (t < ESPERA) {
        var w = (t - NASCE) / (ESPERA - NASCE);
        return { r: RAIO + 5 * Math.sin(w * Math.PI), k: ESCALA_BOLHA * (1 + 0.04 * w), x: bolha.x, y: mistura(bolha.y, bolhaAlta.y, w), borra: 0, anel: 1 };
      }
      var v = Math.min(1, (t - ESPERA) / (FECHA - ESPERA));
      var p = suaveDentroFora(v);
      return {
        r: Math.exp(mistura(Math.log(RAIO), Math.log(raioFinal), p)),
        k: Math.exp(mistura(Math.log(ESCALA_BOLHA * 1.04), Math.log(ESCALA_FINAL), p)),
        x: mistura(bolhaAlta.x, destino.x, p),
        y: mistura(bolhaAlta.y, destino.y, p),
        borra: 10 * Math.pow(Math.sin(Math.PI * v), 2),
        anel: 1 - Math.min(1, Math.max(0, (p - 0.45) / 0.55)),
      };
    };

    var anel = c.sel.frente + ' .pt-anel';
    var total = Math.round(FECHA / PASSO);
    for (var i = 0; i <= total; i++) {
      var t = i * PASSO;
      var e = estado(t);
      var r = Math.max(0.5, e.r);
      tl.set(c.sel.cam, {
        scale: e.k,
        x: e.x - ORIGEM.x - e.k * (rosto.x - ORIGEM.x),
        y: e.y - ORIGEM.y - e.k * (rosto.y - ORIGEM.y),
        clipPath: 'circle(' + (r / e.k).toFixed(1) + 'px at ' + rosto.x + 'px ' + rosto.y + 'px)',
        filter: e.borra > 0.05 ? 'blur(' + e.borra.toFixed(2) + 'px)' : 'none',
      }, t0 + t);
      tl.set(anel, { x: e.x - r, y: e.y - r, width: 2 * r, height: 2 * r, opacity: e.anel }, t0 + t);
    }

    // a bolha fechou: some o recorte, o zoom assenta
    var fecha = t0 + FECHA;
    tl.set(c.sel.cam, { clipPath: 'none', filter: 'none' }, fecha + PASSO);
    // no fim do crescimento o x e o y já chegaram a 0 (a conta acima fecha no rosto); só o zoom assenta
    tl.fromTo(c.sel.cam, { scale: ESCALA_FINAL }, { scale: 1, duration: ASSENTA, ease: 'power2.out', immediateRender: false }, fecha + PASSO);
    tl.fromTo(c.sel.frente + ' .pt-clarao', { opacity: 0.55 }, { opacity: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, fecha);

    // vida no fundo: o céu respira, os ecos saem da bolha enquanto ela espera, o arco gira
    tl.fromTo(c.sel.fundo + ' .pt-ceu', { scale: 1.08 }, { scale: 1, duration: FECHA, ease: 'none' }, t0);
    tl.fromTo(c.sel.fundo + ' .pt-eco', { scale: 1, opacity: 0.55 }, { scale: 3.2, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.16 }, t0 + 0.12);
    tl.fromTo(anel + ' .pt-arco', { rotation: -40 }, { rotation: 320, duration: FECHA, ease: 'power1.inOut' }, t0);
  };
})();
