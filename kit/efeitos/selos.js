/* Selos de check: de 2 a 4 pílulas com check entram uma a uma ao lado da cabeça.
   Determinístico: só tweens e sets na linha do tempo, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };

  var ALTURA = 116, VAO = 22;   // altura de cada pílula e o espaço entre elas
  // Tempos fixos, iguais aos da ficha: o pop de cada selo ("em": 0.14, "repetir" com passo 0.42)
  // bate quando a bola estoura (0,12 + 0,02 depois do início, mais 0,42 por item).
  var ENTRA = 0.12, INTERVALO = 0.42;
  var SAIDA = 0.4, SAIDA_MINIMA = 0.26;

  window.__efeito.selos = function (tl, c) {
    var pe = c.pessoa; // medida da cena, ou o lugar típico do kit quando pe.medida === false
    var itens = (Array.isArray(c.p.itens) ? c.p.itens : []).map(function (t) { return String(t).trim(); }).filter(Boolean).slice(0, 4);
    if (!itens.length) itens = ['Feito', 'Pronto'];
    var n = itens.length;

    // lado com mais espaço; a pilha termina na altura do boné, longe dos olhos e da boca
    var direita = (850 - pe.direita) > (pe.esquerda - 60);
    var maior = itens.reduce(function (m, t) { return Math.max(m, t.length); }, 0);
    var fonte = Math.max(38, Math.min(58, Math.floor(600 / (maior * 0.56))));
    var base = pe.topo + 110;
    var topo = Math.max(270, base - n * ALTURA - (n - 1) * VAO);

    var html = '<div class="sl-pilha ' + (direita ? 'sl-dir' : 'sl-esq') + '" style="top:' + topo + 'px;--fs:' + fonte + 'px">';
    itens.forEach(function (t, k) {
      html += '<div class="sl-selo" style="top:' + k * (ALTURA + VAO) + 'px">' +
        '<span class="sl-bola"><span class="sl-onda"></span><svg viewBox="0 0 40 40"><path d="M11 20.5l6 6L29.5 14"/></svg></span>' +
        '<span class="sl-txt">' + esc(t) + '</span><span class="sl-luz"></span></div>';
    });
    c.frente.innerHTML = html + '</div>';

    var t0 = c.inicio;
    var intervalo = INTERVALO;
    var ultimo = t0 + ENTRA + (n - 1) * intervalo;
    // a saída espera o último selo assentar; em cena curta ela encurta, mas nunca passa do fim
    var sai = Math.max(c.fim - SAIDA, Math.min(ultimo + 0.5, c.fim - SAIDA_MINIMA));
    var tempoSaida = c.fim - sai;
    var f = function (s) { return c.sel.frente + ' ' + s; };
    var lado = direita ? 50 : -50;

    itens.forEach(function (_, k) {
      var tk = t0 + ENTRA + k * intervalo;
      var s = f('.sl-selo:nth-child(' + (k + 1) + ')');
      tl.fromTo(s, { opacity: 0, scale: 0.6, x: lado, rotation: direita ? 5 : -5 },
        { opacity: 1, scale: 1, x: 0, rotation: 0, duration: 0.45, ease: 'back.out(2.1)' }, tk - 0.04);
      // a pílula nasce redonda (só a bola) e abre para o texto; a folga negativa deixa a sombra aparecer
      var fechada = direita ? 'inset(-30px -30px -46px calc(100% - 146px) round 88px)' : 'inset(-30px calc(100% - 146px) -46px -30px round 88px)';
      var aberta = direita ? 'inset(-30px -30px -46px calc(0% - 30px) round 88px)' : 'inset(-30px calc(0% - 30px) -46px -30px round 88px)';
      tl.fromTo(s, { clipPath: fechada }, { clipPath: aberta, duration: 0.42, ease: 'power3.out' }, tk + 0.1);
      tl.set(s, { clipPath: 'none' }, tk + 0.55);
      tl.fromTo(s + ' .sl-bola', { scale: 0 }, { scale: 1, duration: 0.36, ease: 'back.out(3)' }, tk + 0.02);
      tl.fromTo(s + ' path', { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.26, ease: 'power2.out' }, tk + 0.12);
      tl.fromTo(s + ' .sl-onda', { scale: 0.8, opacity: 0.7 }, { scale: 2.1, opacity: 0, duration: 0.45, ease: 'power2.out' }, tk + 0.12);
      tl.fromTo(s + ' .sl-txt', { clipPath: 'inset(0% 100% 0% 0%)', x: -14 }, { clipPath: 'inset(0% 0% 0% 0%)', x: 0, duration: 0.4, ease: 'power3.out' }, tk + 0.14);
    });

    // todos marcados: um brilho corre pelas pílulas, a pilha flutua de leve até sair
    if (sai - (ultimo + 0.45) > 0.3) tl.fromTo(f('.sl-luz'), { xPercent: -120 }, { xPercent: 260, duration: 0.6, ease: 'power2.inOut', stagger: 0.06 }, ultimo + 0.45);
    tl.fromTo(f('.sl-pilha'), { y: 6 }, { y: -8, duration: Math.max(0.5, sai - t0), ease: 'sine.inOut' }, t0);

    // saída: de baixo para cima, voltam para o lado de onde vieram
    var cada = Math.min(0.05, tempoSaida * 0.12);
    var duracaoSaida = Math.max(0.12, Math.min(0.26, tempoSaida - cada * (n - 1) - 0.02));
    tl.to(f('.sl-selo'), { opacity: 0, x: lado * 0.8, scale: 0.9, duration: duracaoSaida, ease: 'power2.in', stagger: { each: cada, from: 'end' } }, sai);
  };
})();
