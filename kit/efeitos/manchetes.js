/* Chuva de manchetes: faixas de jornal de TV entram em batida, inclinadas.
   As primeiras ficam na frente, acima da cabeça; as outras passam atrás dela (camada de trás,
   com a pessoa recortada por cima). Determinístico: posições, tremores e derivas vêm de listas fixas. */
(function () {
  window.__efeito = window.__efeito || {};
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };

  var BATIDA = 0.15; // segundos entre uma faixa e a próxima
  var ENTRA = 0.42; // duração da entrada de cada faixa
  var POUSO = 0.11; // quando a faixa "bate" depois de começar a entrar
  var QUADRO = 1 / 30;
  // tremor de três quadros a cada pouso (px), alternando o lado
  var TREMOR = [[9, -5], [-6, 4], [0, 0]];
  // inclinação por posição: frente de cima para baixo, trás de cima para baixo
  var GIRO_FRENTE = [-6.5, 5, -3.5];
  var GIRO_ATRAS = [5.5, -7.5, 4];
  // recuo de cada faixa em relação à borda de onde entra (px): quebra o alinhamento de lista
  var RECUO = [0, 70, 130, 30, 100, 50];
  var LETRA = 0.53; // largura média de uma letra em caixa alta, em fração do tamanho da fonte
  var LIMITE_DIREITO = 880; // a faixa termina antes dos botões do Instagram

  function tamanhoDaLetra(texto) {
    var chars = Math.max(8, texto.length);
    return Math.round(Math.max(40, Math.min(62, 600 / (chars * LETRA))));
  }

  function faixa(texto, etiqueta, estilo, lado, y, giro, fs, recuo) {
    var largura = Math.round(texto.length * fs * LETRA + 58 + etiqueta.length * 25 + 76);
    // da esquerda: parte de x=56 mais o recuo; da direita: termina antes dos botões, menos o recuo
    var folga = Math.max(0, LIMITE_DIREITO - 56 - largura);
    var esquerda = lado < 0 ? 56 + Math.min(recuo, folga) : Math.max(56, LIMITE_DIREITO - largura - Math.min(recuo, folga));
    return '<div class="mc-faixa ' + estilo + '" style="left:' + esquerda + 'px;top:' + Math.round(y - 52) + 'px;--giro:' + giro + 'deg">' +
      '<div class="mc-deriva"><span class="mc-tag"><i></i>' + esc(etiqueta) + '</span>' +
      '<span class="mc-texto" style="font-size:' + fs + 'px">' + esc(texto) + '</span></div></div>';
  }

  // faixa funda, atrás do rosto: sem etiqueta, letra maior e centrada na cabeça,
  // para o começo e o fim do texto aparecerem dos dois lados
  function faixaFunda(texto, estilo, y, giro, fs, centro) {
    var largura = Math.round(texto.length * fs * LETRA + 58);
    var esquerda = Math.max(30, Math.min(1010 - largura, centro - largura / 2));
    return '<div class="mc-faixa mc-funda ' + estilo + '" style="left:' + Math.round(esquerda) + 'px;top:' + Math.round(y - 52) + 'px;--giro:' + giro + 'deg">' +
      '<div class="mc-deriva"><span class="mc-texto" style="font-size:' + fs + 'px">' + esc(texto) + '</span></div></div>';
  }

  // Trilha da cabeça (c.pessoa.trilha, a cada 0,5 s): devolve [{ t, topo }] suavizada.
  function trilhaDoTopo(pes) {
    var pts = Array.isArray(pes.trilha) && pes.trilha.length ? pes.trilha : [{ t: 0, topo: pes.topo }];
    return pts.map(function (q, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      return { t: q.t, topo: (a.topo + 2 * q.topo + b.topo) / 4 };
    });
  }

  window.__efeito.manchetes = function (tl, c) {
    var p = c.p || {};
    var itens = (Array.isArray(p.itens) ? p.itens : []).map(function (s) { return String(s || '').trim(); }).filter(Boolean).slice(0, 6);
    if (!itens.length) itens = ['Novidade agora', 'Todo mundo comentando', 'Veja até o fim'];
    var etiqueta = String(p.etiqueta || 'Agora').trim().split(' ')[0];
    var n = itens.length;
    // a cabeça se mexe: o desenho usa o topo do meio da cena e as faixas de trás seguem a trilha
    var cabeca = trilhaDoTopo(c.pessoa);
    var topos = cabeca.map(function (q) { return q.topo; }).sort(function (a, b) { return a - b; });
    var T = topos[Math.floor(topos.length / 2)];

    // linhas da frente: acima da cabeça, da mais alta para a mais baixa, sem sair da zona segura.
    // Quanto mais linhas couberem na frente, mais manchetes ficam inteiras; atrás vão no máximo três.
    var baseFrente = T - 150;
    var cabem = 1 + Math.floor(Math.max(0, baseFrente - 330) / 112);
    var nf = Math.max(Math.ceil(n / 2), Math.min(n - 1, cabem, n - 1));
    if (n - nf > 3) nf = n - 3;
    var passoFrente = nf > 1 ? Math.min(165, (baseFrente - 330) / (nf - 1)) : 0;
    var yFrente = [];
    for (var f = 0; f < nf; f++) yFrente.push(baseFrente - passoFrente * (nf - 1 - f));
    // linhas de trás: a primeira raspa o alto da cabeça (lê quase inteira, a cabeça morde o meio);
    // as outras cruzam atrás da testa e dos olhos e aparecem só nas laterais
    var yAtras = [T + 22, T + 200, T + 370];

    // ordem de entrada intercalada: frente, trás, frente, trás...
    var ordem = [];
    var fi = 0, ai = 0;
    for (var k = 0; k < n; k++) {
      var naFrente = (k % 2 === 0 && fi < nf) || ai >= n - nf;
      ordem.push(naFrente ? { camada: 'frente', j: fi++ } : { camada: 'atras', j: ai++ });
    }

    var htmlFrente = '', htmlAtras = '';
    var faixas = []; // { sel, lado, camada }
    ordem.forEach(function (o, k) {
      var texto = itens[o.camada === 'frente' ? o.j : nf + o.j];
      var lado = k % 2 === 0 ? -1 : 1; // -1 entra pela esquerda, 1 pela direita
      var estilo = k % 3 === 2 ? 'mc-escura' : 'mc-clara';
      var fs = tamanhoDaLetra(texto);
      var giro = o.camada === 'frente' ? GIRO_FRENTE[o.j % 3] : GIRO_ATRAS[o.j % 3];
      var y = o.camada === 'frente' ? yFrente[o.j] : yAtras[o.j % 3];
      var funda = o.camada === 'atras' && o.j > 0;
      var centro = (c.pessoa.esquerda + c.pessoa.direita) / 2 + (o.j % 2 ? -60 : 60);
      var bloco = funda
        ? faixaFunda(texto, estilo + ' mc-n' + k, y, giro, Math.min(68, Math.round(fs * 1.2)), centro)
        : faixa(texto, etiqueta, estilo + ' mc-n' + k, lado, y, giro, fs, RECUO[k]);
      if (o.camada === 'frente') htmlFrente += bloco; else htmlAtras += bloco;
      faixas.push({ sel: (o.camada === 'frente' ? c.sel.frente : c.sel.atras) + ' .mc-n' + k, lado: lado, camada: o.camada, giro: giro });
    });

    c.atras.innerHTML = '<div class="mc-veu"></div><div class="mc-palco">' + htmlAtras + '</div>';
    c.frente.innerHTML = '<div class="mc-palco">' + htmlFrente + '</div><div class="mc-flash"></div>';

    var t0 = c.inicio;
    var tFim = c.fim - 0.04;
    var saida = Math.min(0.42, c.dur * 0.22);
    var passo = n > 1 ? Math.max(0.07, Math.min(BATIDA, (c.dur - saida - ENTRA - 0.35) / (n - 1))) : 0;
    var tSai = tFim - saida;
    var palcos = [c.sel.atras + ' .mc-palco', c.sel.frente + ' .mc-palco'];

    if (c.recorte) tl.set(c.recorte, { opacity: 1 }, t0);
    // véu escuro leve no alto, atrás da pessoa: as faixas claras saltam da parede
    tl.fromTo(c.sel.atras + ' .mc-veu', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, t0);

    faixas.forEach(function (fx, k) {
      var tk = t0 + k * passo;
      var pouso = tk + POUSO;
      // entra deslizando de fora, inclinada a mais, e bate no lugar
      var escala = fx.camada === 'frente' ? 1 : 0.9; // as de trás parecem mais longe
      tl.fromTo(fx.sel, { x: fx.lado * 1250, rotation: fx.giro - fx.lado * 7, scale: escala * 1.12 },
        { x: 0, rotation: fx.giro, scale: escala, duration: ENTRA, ease: 'expo.out' }, tk);
      // tremor de três quadros no palco inteiro
      TREMOR.forEach(function (d, q) {
        var s = k % 2 ? -1 : 1;
        tl.to(palcos, { x: d[0] * s, y: d[1], duration: QUADRO, ease: 'power2.out' }, pouso + q * QUADRO);
      });
      // parallax: frente e fundo andam em sentidos opostos
      // as de trás andam ao contrário, mais devagar: dá a sensação de fundo
      var deriva = fx.camada === 'frente' ? 36 : -60;
      tl.fromTo(fx.sel + ' .mc-deriva', { x: 0 }, { x: deriva * -fx.lado, duration: Math.max(0.3, tSai - pouso), ease: 'sine.inOut' }, pouso);
      // a bolinha de "ao vivo" pisca um número fixo de vezes
      var piscadas = Math.max(1, Math.floor((tSai - pouso) / 0.5));
      tl.fromTo(fx.sel + ' .mc-tag i', { opacity: 1 }, { opacity: 0.25, duration: 0.25, ease: 'steps(1)', yoyo: true, repeat: piscadas * 2 - 1 }, pouso);
    });

    // as faixas de trás sobem e descem com a cabeça (trilha), para continuar raspando o boné
    var deTras = faixas.filter(function (fx) { return fx.camada === 'atras'; }).map(function (fx) { return fx.sel; });
    if (deTras.length) {
      var durTotal = tFim - t0;
      tl.set(deTras, { y: cabeca[0].topo - T }, t0);
      for (var m = 1; m < cabeca.length && cabeca[m - 1].t < durTotal; m++) {
        var de = cabeca[m - 1].t, ate = Math.min(durTotal, cabeca[m].t);
        tl.to(deTras, { y: cabeca[m].topo - T, duration: Math.max(0.05, ate - de), ease: 'sine.inOut' }, t0 + de);
      }
    }

    // o conjunto inteiro chega um pouco mais perto durante a cena (a frente mais que o fundo)
    tl.fromTo(c.sel.frente + ' .mc-palco', { scale: 1, transformOrigin: '540px 700px' }, { scale: 1.05, duration: Math.max(0.3, tSai - t0), ease: 'none' }, t0);
    tl.fromTo(c.sel.atras + ' .mc-palco', { scale: 1, transformOrigin: '540px 700px' }, { scale: 1.02, duration: Math.max(0.3, tSai - t0), ease: 'none' }, t0);

    // clarão rápido na primeira pancada
    tl.fromTo(c.sel.frente + ' .mc-flash', { opacity: 0.32 }, { opacity: 0, duration: 0.18, ease: 'power2.out' }, t0 + POUSO);

    // saída: as faixas seguem viagem no mesmo sentido em que entraram, da última para a primeira
    faixas.slice().reverse().forEach(function (fx, r) {
      tl.to(fx.sel, { x: fx.lado * -1300, rotation: fx.giro + fx.lado * 5, duration: saida * 0.7, ease: 'power3.in' }, tSai + r * Math.min(0.035, saida * 0.2 / n));
    });
    tl.to(c.sel.atras + ' .mc-veu', { opacity: 0, duration: saida, ease: 'power2.in' }, tSai);
  };
})();
