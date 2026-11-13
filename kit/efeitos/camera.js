/* Zoom digital: moldura de câmera filmando (REC, zoom, contador) e o rosto aproximando em degraus.
   Determinístico: só tweens e sets na linha do tempo. O contador troca por sets, um por segundo. */
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
  var dois = function (n) { return n < 10 ? '0' + n : String(n); };
  var relogio = function (s) { return dois(Math.floor(s / 3600)) + ':' + dois(Math.floor(s / 60) % 60) + ':' + dois(s % 60); };
  var leitura = function (z) { return z.toFixed(1).replace('.', ',') + '×'; };

  window.__efeito.camera = function (tl, c) {
    var take = c.sel.take;
    var foco = focoDoRosto(c.pessoa);
    var t0 = c.inicio;
    var fim = c.fim;
    var ate = typeof c.p.ate === 'number' ? Math.max(1.2, Math.min(1.8, c.p.ate)) : 1.6;
    var niveis = [1, Math.round((1 + ate) / 2 * 10) / 10, ate];
    // degraus em tempo fixo depois do início (o som bate junto); a volta a 1x vem perto do fim
    var degraus = [t0 + 0.3, t0 + 0.95];
    var volta = Math.max(degraus[1] + 0.3, fim - 0.36);

    // contador: começa no segundo do Reel em que a cena está e anda de segundo em segundo
    var primeiro = Math.floor(t0);
    var tiques = [];
    for (var s = primeiro; s <= Math.ceil(fim); s += 1) tiques.push(s);
    var contador = tiques.map(function (s, k) { return '<span class="cm-tc cm-tc' + k + '">' + relogio(s) + '</span>'; }).join('');
    var zooms = niveis.map(function (z, k) { return '<span class="cm-z cm-z' + k + '">' + leitura(z) + '</span>'; }).join('');
    // régua W–T: marca de 1x até 2x
    var marcas = '';
    for (var m = 0; m <= 10; m += 1) marcas += '<i style="top:' + (m * 10) + '%"></i>';
    var nivelDaRegua = function (z) { return (1 - (z - 1)) * 100; };

    // mira de foco: um quadrado nos olhos, do tamanho do rosto; cresce junto com o zoom
    var larguraCabeca = Math.max(200, c.pessoa.direita - c.pessoa.esquerda);
    var mira = { y: Math.round(foco.y - larguraCabeca * 0.12), lado: Math.round(larguraCabeca * 0.6) };
    var idPixel = 'cm-pixel-' + c.id; // o id da cena já nomeia as camadas do motor
    c.frente.innerHTML =
      '<div class="cm-quadro">' +
        '<b class="cm-l cm-l1"></b><b class="cm-l cm-l2"></b><b class="cm-l cm-l3"></b><b class="cm-l cm-l4"></b>' +
      '</div>' +
      '<div class="cm-barra">' +
        '<div class="cm-rec"><span class="cm-bola"></span>REC</div>' +
        '<div class="cm-zoom">' + zooms + '</div>' +
        '<div class="cm-tempo">' + contador + '</div>' +
      '</div>' +
      '<div class="cm-regua"><span class="cm-t">T</span><div class="cm-trilho">' + marcas + '<em class="cm-cursor"></em></div><span class="cm-w">W</span></div>' +
      '<div class="cm-mira" style="left:' + foco.x + 'px;top:' + mira.y + 'px;width:' + mira.lado + 'px;height:' + mira.lado + 'px;margin:' + (-mira.lado / 2) + 'px 0 0 ' + (-mira.lado / 2) + 'px"><b></b><b></b><b></b><b></b></div>' +
      '<div class="cm-linhas"></div>' +
      // filtro de pixel do zoom digital: o quadro vira blocos por um instante a cada degrau
      '<svg class="cm-svg" width="0" height="0" aria-hidden="true"><filter id="' + idPixel + '" x="0" y="0" width="100%" height="100%">' +
        '<feFlood x="7" y="7" width="4" height="4"/><feComposite width="18" height="18"/><feTile result="grade"/>' +
        '<feComposite in="SourceGraphic" in2="grade" operator="in"/><feMorphology operator="dilate" radius="9"/>' +
      '</filter></svg>';
    var f = function (sel) { return c.sel.frente + ' ' + sel; };

    // estado inicial
    tl.set(take, junta(aproxima(foco, 1), { filter: 'blur(0px) contrast(1) saturate(1)', xPercent: 0, yPercent: 0 }), t0);
    tl.set([f('.cm-tc'), f('.cm-z')], { opacity: 0 }, t0);
    tl.set([f('.cm-tc0'), f('.cm-z0')], { opacity: 1 }, t0);
    tl.set(f('.cm-cursor'), { top: nivelDaRegua(1) + '%' }, t0);

    // a moldura entra: cantos fecham de fora para dentro, barra e régua chegam
    tl.fromTo(f('.cm-quadro'), { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'expo.out' }, t0);
    tl.fromTo(f('.cm-barra'), { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, t0 + 0.05);
    tl.fromTo(f('.cm-regua'), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, t0 + 0.1);
    tl.fromTo(f('.cm-linhas'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t0);
    tl.fromTo(f('.cm-mira'), { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'expo.out' }, t0 + 0.08);
    // a moldura respira o tempo todo (nunca fica parada)
    tl.fromTo(f('.cm-quadro'), { '--folga': '0px' }, { '--folga': '10px', duration: Math.max(0.5, volta - t0), ease: 'sine.inOut' }, t0);

    // bolinha do REC pisca em ritmo fixo
    var piscadas = Math.max(1, Math.floor((fim - t0) / 0.5));
    tl.fromTo(f('.cm-bola'), { opacity: 1 }, { opacity: 0.15, duration: 0.25, ease: 'steps(1)', repeat: piscadas * 2 - 1, yoyo: true }, t0 + 0.25);

    // contador anda de segundo em segundo
    tiques.forEach(function (s, k) {
      if (k === 0 || s >= fim) return;
      tl.set(f('.cm-tc' + (k - 1)), { opacity: 0 }, s);
      tl.set(f('.cm-tc' + k), { opacity: 1 }, s);
    });

    // cada degrau: zoom seco com micro-tranco, borrão de foco, leitura troca e a régua sobe
    var degrau = function (t, de, para, kDe, kPara) {
      tl.to(take, { keyframes: [
        junta(aproxima(foco, para + 0.035), { duration: 0.09, ease: 'power3.out' }),
        junta(aproxima(foco, para), { duration: 0.22, ease: 'power2.out' }),
      ] }, t);
      tl.to(take, { keyframes: [
        { filter: 'blur(7px) contrast(1.12) saturate(1.1)', duration: 0.05, ease: 'power1.out' },
        { filter: 'blur(0px) contrast(1) saturate(1)', duration: 0.22, ease: 'power2.out' },
      ] }, t);
      tl.to(take, { keyframes: [
        { yPercent: -0.5, duration: 0.04 }, { yPercent: 0.35, duration: 0.05 }, { yPercent: 0, duration: 0.08, ease: 'power2.out' },
      ] }, t);
      tl.set(f('.cm-z' + kDe), { opacity: 0 }, t);
      tl.fromTo(f('.cm-z' + kPara), { opacity: 1, scale: 1.35 }, { scale: 1, duration: 0.3, ease: 'expo.out' }, t);
      tl.to(f('.cm-cursor'), { top: nivelDaRegua(para) + '%', duration: 0.18, ease: 'power3.out' }, t);
      // a mira acompanha o tamanho do rosto, passa do ponto e trava piscando
      var ancoraMira = (mira.y - foco.y) * (para - 1);
      tl.to(f('.cm-mira'), { keyframes: [
        { scale: para * 1.18, y: ancoraMira, duration: 0.12, ease: 'power3.out' },
        { scale: para, duration: 0.18, ease: 'power2.out' },
      ] }, t);
      tl.fromTo(f('.cm-mira b'), { opacity: 0.3 }, { opacity: 1, duration: 0.05, repeat: 2, yoyo: true, ease: 'steps(1)', immediateRender: false }, t + 0.3);
      tl.set(c.sel.cam, { filter: 'url(#' + idPixel + ')' }, t + 0.033);
      tl.set(c.sel.cam, { filter: 'none' }, t + 0.1);
      tl.fromTo(f('.cm-quadro'), { scale: 0.985 }, { scale: 1, duration: 0.3, ease: 'expo.out' }, t);
    };
    degrau(degraus[0], niveis[0], niveis[1], 0, 1);
    degrau(degraus[1], niveis[1], niveis[2], 1, 2);
    // entre os degraus e depois deles, a câmera deriva devagar (mão segurando)
    tl.to(take, { xPercent: 0.4, duration: Math.max(0.2, volta - degraus[1] - 0.4), ease: 'sine.inOut' }, degraus[1] + 0.35);

    // volta a 1x com um puxão e a moldura sai antes do fim
    tl.to(take, junta(aproxima(foco, 1), { xPercent: 0, duration: 0.24, ease: 'expo.inOut' }), volta);
    tl.to(take, { keyframes: [
      { filter: 'blur(8px) contrast(1.1) saturate(1.1)', duration: 0.1, ease: 'power2.in' },
      { filter: 'blur(0px) contrast(1) saturate(1)', duration: 0.14, ease: 'power2.out' },
    ] }, volta);
    tl.set(c.sel.cam, { filter: 'url(#' + idPixel + ')' }, volta + 0.08);
    tl.set(c.sel.cam, { filter: 'none' }, volta + 0.15);
    tl.set(f('.cm-z2'), { opacity: 0 }, volta);
    tl.set(f('.cm-z0'), { opacity: 1 }, volta);
    tl.to(f('.cm-cursor'), { top: nivelDaRegua(1) + '%', duration: 0.2, ease: 'power3.inOut' }, volta);
    tl.to(f('.cm-mira'), { scale: 1, y: 0, opacity: 0, duration: 0.24, ease: 'expo.inOut' }, volta);
    tl.to(c.sel.frente, { opacity: 0, duration: 0.22, ease: 'power2.in' }, Math.max(volta + 0.05, fim - 0.24));
    tl.set(c.sel.frente, { opacity: 1 }, fim);
  };
})();
