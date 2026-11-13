/* Efeito vertigem: só o fundo cresce (ou recua) atrás da pessoa, que fica do mesmo tamanho.
   O fundo é o PNG do primeiro quadro com a pessoa vazada (c.fundoSemPessoa). O buraco da pessoa
   é tapado por cópias deslocadas do próprio fundo (um "carimbo" grosseiro, desfocado): quando o fundo
   cresce, a borda em volta da pessoa mostra parede, não a pessoa do take.
   Sem esse PNG (projeto antigo), cai no jeito antigo: o take inteiro encolhe atrás do recorte.
   Determinístico: só tweens e sets na linha do tempo. */
(function () {
  window.__efeito = window.__efeito || {};

  var PERTO = 1.3;  // fundo chegando: quanto ele cresce
  var LONGE = 0.8;  // fundo recuando: quanto ele encolhe
  // cópias que tapam o buraco: deslocamento [x, y] em px. Positivo em y desce a imagem: traz a parede de cima
  // para o lugar da cabeça; para os lados, traz a parede vizinha. A ordem vai da mais longe para a mais perto.
  var CARIMBO = [[0, 900], [0, 520], [-560, 160], [560, 160], [-300, 300], [300, 300], [-600, 0], [600, 0], [-330, 0], [330, 0]];

  function camada(url, classe, extra) {
    return '<div class="' + classe + '" style="background-image:url(' + url + ');' + (extra || '') + '"></div>';
  }

  window.__efeito.dolly = function (tl, c) {
    var t0 = c.inicio;
    var afasta = c.p.direcao === 'afasta';
    var pes = c.pessoa;
    // o centro do movimento é o rosto: é ele que fica parado enquanto o mundo anda
    var ox = Math.round((pes.esquerda + pes.direita) / 2);
    var oy = Math.round(pes.topo + (pes.direita - pes.esquerda) * 0.55);
    var origem = ox + 'px ' + oy + 'px';
    var sai = Math.max(t0 + 1.1, c.fim - 0.32);
    var volta = Math.max(0.16, Math.min(0.28, c.fim - sai - 0.02));
    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var f = function (sel) { return c.sel.fundo + ' ' + sel; };

    if (c.fundoSemPessoa) {
      var u = c.fundoSemPessoa;
      // cópia que vem de um lado só vale daquele lado do rosto (a estante da direita tapa a direita)
      var lado = function (dx) {
        if (!dx) return '';
        var m = dx < 0 ? 'linear-gradient(90deg, transparent ' + (ox - 60) + 'px, #000 ' + (ox + 60) + 'px)'
          : 'linear-gradient(90deg, #000 ' + (ox - 60) + 'px, transparent ' + (ox + 60) + 'px)';
        return '-webkit-mask-image:' + m + ';mask-image:' + m + ';';
      };
      // a borda do buraco traz uma franja escura (cabelo, boné): o filtro corta o meio-transparente e
      // come 12 px da borda e esfuma, só no canal de transparência (a cor do fundo não muda)
      var fa = 'dz-' + c.id + '-borda', fb = 'dz-' + c.id + '-carimbo';
      var corte = '<feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="discrete" tableValues="0 0 0 0 1"/></feComponentTransfer>' +
        '<feMorphology in="a" operator="erode" radius="12" result="e0"/><feGaussianBlur in="e0" stdDeviation="9" result="e"/>' +
        '<feComposite in="SourceGraphic" in2="e" operator="in" result="c"/>';
      var filtros = '<svg class="dz-filtros" width="0" height="0"><filter id="' + fa + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' + corte + '</filter>' +
        '<filter id="' + fb + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' + corte + '<feGaussianBlur in="c" stdDeviation="12"/></filter></svg>';
      var copias = CARIMBO.map(function (d) {
        return camada(u, 'dz-copia', 'filter:url(#' + fb + ');background-position:' + d[0] + 'px ' + d[1] + 'px;' + lado(d[0]));
      }).join('');
      // por fora (só aparece quando o fundo recua): o mesmo fundo, maior e desfocado
      c.atras.innerHTML = filtros + '<div class="dz-fora">' + camada(u, 'dz-fora-img') + '</div>' +
        '<div class="dz-placa' + (afasta ? ' dz-pluma' : '') + '" style="transform-origin:' + origem + '">' +
        '<div class="dz-base"></div>' + copias + camada(u, 'dz-principal', 'filter:url(#' + fa + ');') + '</div>' +
        '<div class="dz-luz"></div>';

      if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
      tl.set(q('.dz-fora'), { opacity: afasta ? 1 : 0 }, t0);
      var alvo = afasta ? LONGE : PERTO;
      // o fundo anda devagar no começo, embala no meio e assenta: a sensação de chão que some
      tl.fromTo(q('.dz-placa'), { scale: 1, filter: 'blur(0px) brightness(1)' },
        { scale: alvo, filter: 'blur(2.5px) brightness(0.86)', duration: sai - t0, ease: 'power1.inOut' }, t0);
      tl.fromTo(q('.dz-luz'), { opacity: 0 }, { opacity: 1, duration: sai - t0, ease: 'power1.inOut' }, t0);
      // o tapa-buraco só entra quando o fundo começa a crescer: no começo (e no fim) o buraco mostra o take ao vivo,
      // que bate certinho com o recorte; assim a troca para o fundo parado não se nota
      if (!afasta) {
        tl.fromTo(q('.dz-base, .dz-copia'), { opacity: 0 }, { opacity: 1, duration: Math.min(0.6, (sai - t0) * 0.4), ease: 'power1.in' }, t0 + 0.05);
        tl.to(q('.dz-base, .dz-copia'), { opacity: 0, duration: volta, ease: 'power2.in' }, sai);
      }
      if (afasta) tl.fromTo(q('.dz-fora-img'), { scale: 1.15 }, { scale: 1.02, duration: sai - t0, ease: 'power1.inOut' }, t0);
      // volta num estalo antes do fim: no último quadro o fundo está igual ao take, sem corte
      tl.to(q('.dz-placa'), { scale: 1, filter: 'blur(0px) brightness(1)', duration: volta, ease: 'expo.inOut' }, sai);
      tl.to(q('.dz-luz'), { opacity: 0, duration: volta, ease: 'power2.in' }, sai);
      return;
    }

    // jeito antigo (sem fundo vazado): o take encolhe atrás do recorte e a sala desfocada preenche a borda
    var cy = Math.max(1250, Math.min(1600, Math.round(pes.topo + 700)));
    var origemTake = '540px ' + cy + 'px';
    var foto = c.foto ? 'background-image:url(' + c.foto + ');' : '';
    c.fundo.innerHTML = '<div class="dz-sala" style="' + foto + 'transform-origin:' + origemTake + '"></div><div class="dz-tinta"></div>';
    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
    tl.set(c.sel.take, { transformOrigin: origemTake }, t0);
    tl.fromTo(c.sel.take, { scale: 1, filter: 'brightness(1)' }, { scale: 0.76, filter: 'brightness(0.82)', duration: sai - t0, ease: 'power2.inOut' }, t0);
    tl.fromTo(f('.dz-sala'), { scale: 1.12 }, { scale: 1, duration: sai - t0, ease: 'power2.inOut' }, t0);
    tl.to(c.sel.take, { scale: 1, filter: 'brightness(1)', duration: volta, ease: 'expo.inOut' }, sai);
  };
})();
