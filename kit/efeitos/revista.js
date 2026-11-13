/* Capa de revista. Determinístico: só tweens e sets na linha do tempo, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};
  // escapa para texto e para atributo (aspas também): o que o aluno escreve nunca vira HTML
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); };

  window.__efeito.revista = function (tl, c) {
    var p = c.p;
    var titulo = String(p.titulo || c.marca.nome || 'REVISTA').toUpperCase();
    // o título cabe na largura: fonte menor para nome longo
    var tamanho = Math.max(150, Math.min(300, Math.floor(1000 / Math.max(3, titulo.length) * 1.55)));
    // a metade de baixo do título fica atrás da cabeça (posição medida no recorte)
    var topo = typeof p.topo_titulo === 'number' ? p.topo_titulo : Math.max(330, Math.round(c.pessoa.topo - tamanho * 0.5));
    var letras = Array.from(titulo).map(function (ch) { return '<span>' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>'; }).join('');
    c.atras.innerHTML = '<div class="rv-papel"></div><div class="rv-titulo" style="top:' + topo + 'px;font-size:' + tamanho + 'px">' + letras + '</div>';

    // chamadas empilhadas à esquerda do rosto, sem encostar nele
    var largura = Math.max(220, Math.min(330, c.pessoa.esquerda - 100));
    var y = topo + Math.round(tamanho * 0.86) + 60;
    var html = '<div class="rv-topo"><span>' + esc(p.edicao || 'Edição especial') + '</span><span>' + esc(c.marca.arroba || '') + '</span></div>';
    (p.chamadas || []).forEach(function (txt, k) {
      html += '<div class="rv-chamada rv-esq" style="top:' + y + 'px;width:' + largura + 'px"><small>' + (k === 0 ? 'Capa' : 'Nesta edição') + '</small>' + esc(txt) + '</div>';
      y += 170;
    });
    // o selo morde o canto do título, longe do rosto
    if (p.selo) html += '<div class="rv-selo" style="top:' + Math.max(300, topo - 90) + 'px">' + esc(p.selo) + '</div>';
    html += '<div class="rv-barras" style="top:' + Math.min(1300, y + 20) + 'px"></div>';
    c.frente.innerHTML = html;

    var t0 = c.inicio;
    var sai = Math.max(t0 + 0.8, c.fim - 0.28);
    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };

    // a pessoa recortada entra junto com o papel; a sombra de cima some (a capa é clara)
    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.2 }, t0);
    tl.fromTo(q('.rv-papel'), { clipPath: 'inset(0px 0px 1920px 0px)' }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.42, ease: 'expo.out' }, t0);
    tl.fromTo(q('.rv-titulo span'), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.035 }, t0 + 0.08);
    tl.fromTo(q('.rv-titulo'), { scale: 1.08 }, { scale: 1, duration: Math.max(0.6, c.dur), ease: 'none' }, t0);
    tl.fromTo(f('.rv-topo'), { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, t0 + 0.2);
    tl.fromTo(f('.rv-chamada'), { opacity: 0, x: function (i) { return i % 2 ? 40 : -40; } }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', stagger: 0.12 }, t0 + 0.3);
    tl.fromTo(f('.rv-selo'), { scale: 0, rotation: -40 }, { scale: 1, rotation: -12, duration: 0.45, ease: 'back.out(2.2)' }, t0 + 0.4);
    tl.fromTo(f('.rv-barras'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t0 + 0.45);
    // saída: a capa sobe e some, a pessoa volta para o fundo de verdade
    tl.to([c.sel.atras, c.sel.frente], { opacity: 0, duration: 0.25, ease: 'power2.in' }, sai);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: 0.25, ease: 'power2.in' }, sai);
    tl.to(c.sel.sombra, { opacity: 1, duration: 0.25 }, sai);
    tl.set([c.sel.atras, c.sel.frente], { opacity: 1 }, c.fim);
  };
})();
