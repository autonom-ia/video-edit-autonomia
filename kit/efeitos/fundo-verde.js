/* Fundo verde: o fundo vira pano de chroma e, na palavra de ênfase, troca por um cenário.
   Determinístico: só tweens e sets na linha do tempo, números fixos, nada de callback. */
(function () {
  window.__efeito = window.__efeito || {};
  // escapa para texto e para atributo (aspas também): o que o aluno escreve nunca vira HTML
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); };

  // prédios do fundo e da frente: [x, largura, topo], listas fixas (largura total 1200 para dar folga ao pan)
  var FUNDO = [[-20, 120, 930], [90, 90, 1010], [170, 140, 860], [300, 110, 960], [400, 160, 900], [550, 100, 1000], [640, 150, 880], [780, 120, 970], [890, 170, 840], [1050, 150, 950]];
  var FRENTE = [[-30, 170, 1060], [130, 120, 1150], [240, 150, 980], [380, 130, 1120], [500, 180, 1040], [670, 120, 1160], [780, 160, 1000], [930, 130, 1100], [1050, 160, 1030]];
  var BEM_LONGE = [[0, 70, 840], [60, 50, 800], [120, 90, 870], [230, 60, 780], [300, 80, 850], [420, 70, 810], [500, 110, 860], [640, 60, 790], [720, 90, 840], [830, 70, 800], [920, 100, 860], [1040, 80, 820], [1110, 90, 850]];
  var TORRE = { x: 252, topo: 760 };
  var ESTRELAS = [[80, 330, 2], [190, 420, 1.5], [330, 300, 2.4], [470, 380, 1.4], [600, 290, 2], [720, 410, 1.6], [860, 320, 2.2], [980, 400, 1.5], [140, 560, 1.4], [420, 520, 1.8], [940, 560, 1.6], [660, 600, 1.3], [1010, 250, 2]];
  var PISCA_TROCA = [[1, 0.03], [0, 0.04], [1, 0.03], [0, 0.03], [1, 0.05]];
  var PISCA_SAIDA = [[0, 0.03], [1, 0.03], [0, 0.04]];

  var janelas = function (b, k) {
    var x = b[0], w = b[1], topo = b[2];
    var s = '';
    var cols = Math.max(2, Math.floor((w - 24) / 26));
    var passoX = (w - 24) / cols;
    for (var lin = 0; topo + 30 + lin * 40 < 1900; lin++) {
      for (var col = 0; col < cols; col++) {
        var acesa = (lin * 7 + col * 13 + k * 5) % 11;
        if (acesa > 3) continue;
        var cor = acesa === 0 ? 'var(--papel)' : 'var(--destaque)';
        s += '<rect x="' + (x + 14 + col * passoX).toFixed(1) + '" y="' + (topo + 30 + lin * 40) + '" width="12" height="18" fill="' + cor + '" opacity="' + (acesa === 3 ? 0.55 : 0.92) + '"/>';
      }
    }
    return s;
  };

  var cidade = function (id) {
    var bemLonge = BEM_LONGE.map(function (b) { return '<rect x="' + b[0] + '" y="' + b[2] + '" width="' + b[1] + '" height="' + (1920 - b[2]) + '"/>'; }).join('');
    var fundo = FUNDO.map(function (b) { return '<rect x="' + b[0] + '" y="' + b[2] + '" width="' + b[1] + '" height="' + (1920 - b[2]) + '"/>'; }).join('');
    var frente = FRENTE.map(function (b) { return '<rect x="' + b[0] + '" y="' + b[2] + '" width="' + b[1] + '" height="' + (1920 - b[2]) + '"/>'; }).join('');
    var luzes = FRENTE.map(janelas).join('');
    var estrelas = ESTRELAS.map(function (e) { return '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="' + e[2] + '"/>'; }).join('');
    return '<svg class="fv-ceu" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice"><defs>' +
      '<linearGradient id="' + id + '-ceu" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="color-mix(in srgb, var(--principal) 30%, #04060a)"/>' +
      '<stop offset="0.38" stop-color="color-mix(in srgb, var(--principal) 75%, #0a0a14)"/>' +
      '<stop offset="0.56" stop-color="color-mix(in srgb, var(--destaque) 55%, var(--principal))"/>' +
      '<stop offset="0.64" stop-color="var(--destaque)"/></linearGradient>' +
      '<radialGradient id="' + id + '-lua"><stop offset="0.3" stop-color="var(--papel)" stop-opacity="0.5"/><stop offset="1" stop-color="var(--papel)" stop-opacity="0"/></radialGradient>' +
      '</defs><rect width="1080" height="1920" fill="url(#' + id + '-ceu)"/>' +
      '<g class="fv-estrelas" fill="#ffffff" opacity="0.8">' + estrelas + '</g>' +
      '<circle cx="175" cy="470" r="120" fill="url(#' + id + '-lua)"/><circle cx="175" cy="470" r="54" fill="var(--papel)"/>' +
      '</svg>' +
      '<svg class="fv-predios fv-bem-longe" viewBox="0 0 1200 1920" width="1200" height="1920"><g fill="color-mix(in srgb, var(--principal) 60%, #2a3238)" opacity="0.55">' + bemLonge + '</g></svg>' +
      '<svg class="fv-predios fv-longe" viewBox="0 0 1200 1920" width="1200" height="1920"><g fill="color-mix(in srgb, var(--principal) 40%, #0c0f12)">' + fundo + '</g></svg>' +
      '<svg class="fv-predios fv-perto" viewBox="0 0 1200 1920" width="1200" height="1920">' +
      '<g fill="color-mix(in srgb, var(--tinta) 85%, var(--principal))">' + frente +
      '<rect x="' + (TORRE.x - 4) + '" y="' + TORRE.topo + '" width="8" height="240"/>' +
      '<polygon points="' + (TORRE.x - 30) + ',990 ' + (TORRE.x + 30) + ',990 ' + (TORRE.x + 8) + ',' + (TORRE.topo + 120) + ' ' + (TORRE.x - 8) + ',' + (TORRE.topo + 120) + '"/></g>' +
      '<g>' + luzes + '</g>' +
      '<circle class="fv-farol" cx="' + TORRE.x + '" cy="' + (TORRE.topo - 6) + '" r="9" fill="var(--destaque)"/>' +
      '</svg>' +
      '<div class="fv-neblina"></div>';
  };

  window.__efeito['fundo-verde'] = function (tl, c) {
    var id = 'fv-' + c.id;
    var cena = c.p.imagem
      ? '<img class="fv-foto" src="' + esc(c.p.imagem) + '" alt="">'
      : cidade(id);
    c.atras.innerHTML =
      '<div class="fv-verde"><div class="fv-dobras"></div><div class="fv-luz"></div></div>' +
      '<div class="fv-cena">' + cena + '</div>';
    c.frente.innerHTML =
      '<div class="fv-mira"><i class="fv-c1"></i><i class="fv-c2"></i><i class="fv-c3"></i><i class="fv-c4"></i><b><s></s>REC</b></div>' +
      '<div class="fv-flash"></div>';

    var t0 = c.inicio;
    var g = c.golpe;
    // a troca é na palavra de ênfase; sem ênfase (ou colada no começo/fim), um ponto seguro no meio
    var troca = (g - t0 >= 0.55 && c.fim - g >= 0.7) ? g : Math.min(t0 + Math.max(0.6, c.dur * 0.4), c.fim - 0.7);
    var sai = Math.max(troca + 0.45, c.fim - 0.26);
    var q = function (sel) { return c.sel.atras + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };
    var pisca = function (alvo, lista, t) {
      tl.to(alvo, { keyframes: lista.map(function (k) { return { opacity: k[0], duration: k[1], ease: 'steps(1)' }; }) }, t);
    };
    var VAZA = 'drop-shadow(0px 0px 7px rgba(60,200,90,0.55))';
    var LIMPO = 'drop-shadow(0px 0px 7px rgba(60,200,90,0))';

    // corte seco para o pano verde; um pouco de verde vaza na borda da pessoa, como de verdade
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.1 }, t0);
    if (c.recorte) tl.set(c.recorte, { opacity: 1, filter: VAZA }, t0);
    tl.set(q('.fv-cena'), { opacity: 0 }, t0);
    tl.fromTo(q('.fv-verde'), { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'expo.out' }, t0);
    tl.fromTo(q('.fv-dobras'), { x: -14 }, { x: 18, duration: Math.max(0.6, troca - t0), ease: 'sine.inOut' }, t0);
    tl.fromTo(q('.fv-luz'), { opacity: 0.7 }, { opacity: 1, duration: Math.max(0.4, troca - t0), ease: 'sine.inOut' }, t0);
    tl.fromTo(f('.fv-mira i'), { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'expo.out', stagger: 0.03 }, t0 + 0.05);
    tl.fromTo(f('.fv-mira b'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + 0.15);
    tl.to(f('.fv-mira s'), { opacity: 0.15, duration: 0.3, yoyo: true, repeat: 5, ease: 'steps(1)' }, t0 + 0.35);

    // a troca: o verde pisca, o cenário entra tremendo e a mira some
    tl.to(q('.fv-verde'), { keyframes: [{ filter: 'brightness(1.45) saturate(1.3)', duration: 0.05 }, { filter: 'brightness(1) saturate(1)', duration: 0.05 }] }, troca - 0.1);
    pisca(q('.fv-cena'), PISCA_TROCA, troca);
    tl.fromTo(q('.fv-cena'), { x: 28 }, { keyframes: [{ x: -18, duration: 0.04 }, { x: 10, duration: 0.04 }, { x: 0, duration: 0.06 }] }, troca);
    tl.set(f('.fv-flash'), { opacity: 0.22 }, troca);
    tl.to(f('.fv-flash'), { opacity: 0, duration: 0.22, ease: 'power2.out' }, troca + 0.01);
    tl.to(f('.fv-mira'), { opacity: 0, duration: 0.1 }, troca);
    if (c.recorte) tl.to(c.recorte, { filter: LIMPO, duration: 0.12 }, troca);
    // o cenário assenta e respira: prédios em camadas que andam devagar
    var resto = Math.max(0.5, c.fim - troca);
    tl.fromTo(q('.fv-cena'), { scale: 1.08 }, { scale: 1, duration: 0.7, ease: 'expo.out' }, troca);
    if (!c.p.imagem) {
      tl.fromTo(q('.fv-bem-longe'), { x: 0 }, { x: -10, duration: resto, ease: 'none' }, troca);
      tl.fromTo(q('.fv-longe'), { x: 0 }, { x: -24, duration: resto, ease: 'none' }, troca);
      tl.fromTo(q('.fv-perto'), { x: 0 }, { x: -60, duration: resto, ease: 'none' }, troca);
      tl.to(q('.fv-farol'), { opacity: 0.2, duration: 0.25, yoyo: true, repeat: 5, ease: 'steps(1)' }, troca + 0.2);
    } else {
      tl.fromTo(q('.fv-foto'), { scale: 1 }, { scale: 1.06, duration: resto, ease: 'none' }, troca);
    }

    // saída: o cenário pisca e o quarto de verdade volta
    pisca(c.sel.atras, PISCA_SAIDA, sai);
    if (c.recorte) tl.to(c.recorte, { opacity: 0, duration: 0.05 }, sai + 0.06);
    tl.to(c.sel.sombra, { opacity: 1, duration: 0.15 }, sai + 0.06);
    tl.set(c.sel.atras, { opacity: 1 }, c.fim);
    if (c.recorte) tl.set(c.recorte, { filter: 'none' }, c.fim);
  };
})();
