/* Motor de animação do Reel. Lê os dados de <script id="dados-reel"> e monta uma linha do tempo GSAP.
   Determinístico: nada aleatório, nenhum relógio, nenhum timer, nenhuma repetição infinita, nenhum fetch.
   Gerado pelo estúdio a partir de kit/molde/reel/animacao.js. */
(function () {
  var D = JSON.parse(document.getElementById('dados-reel').textContent);
  var tl = gsap.timeline({ paused: true });
  var P = 'power3.out';
  var existe = function (sel) { return document.querySelector(sel) !== null; };

  // estados iniciais
  tl.set('.cap', { opacity: 0, visibility: 'hidden' }, 0);
  tl.set('.tela', { opacity: 0, visibility: 'hidden' }, 0);
  if (existe('#cta-selo')) tl.set('#cta-selo', { opacity: 0, visibility: 'hidden' }, 0);
  tl.set('#zoom', { scale: 1 }, 0);

  // faixa clara, rosto e legenda andam juntos: a costura sobe e desce suave
  D.faixas.forEach(function (f) {
    var clip = 'inset(0px 0px ' + (1920 - f.altura) + 'px 0px)';
    var costura = f.altura > 0 && f.altura < 1920 ? 1 : 0;
    var capVars = { y: f.capY, '--cap-tx': f.capTexto, '--cap-sh': f.capSombra };
    if (f.d === 0) {
      tl.set('#faixa', { clipPath: clip }, f.t);
      tl.set('#costura', { y: f.altura, opacity: costura }, f.t);
      tl.set('#cam', { y: f.camY }, f.t);
      tl.set('#caps', capVars, f.t);
      return;
    }
    tl.to('#faixa', { clipPath: clip, duration: f.d, ease: D.ease }, f.t);
    tl.to('#costura', { y: f.altura, opacity: costura, duration: f.d, ease: D.ease }, f.t);
    if (f.altura !== 1920) tl.to('#cam', { y: f.camY, duration: f.d, ease: D.ease }, f.t);
    tl.to('#caps', { y: f.capY, duration: f.d, ease: D.ease }, f.t);
    tl.to('#caps', { '--cap-tx': f.capTexto, '--cap-sh': f.capSombra, duration: 0.12 }, f.t + f.d * 0.5);
  });

  // zoom: abertura, soco (punch) e zoom lento, nunca passando de 1,16 no pico
  D.zoom.forEach(function (z) {
    if (z.de !== undefined) tl.fromTo('#zoom', { scale: z.de }, { scale: z.para, duration: z.dur, ease: z.ease }, z.t);
    else tl.to('#zoom', { scale: z.para, duration: z.dur, ease: z.ease }, z.t);
  });

  // gancho: já está inteiro no quadro 0 e assenta
  if (existe('.gancho-titulo')) {
    tl.fromTo('.gancho-titulo', { scale: 1.04, transformOrigin: '0% 0%' }, { scale: 1, duration: 0.6, ease: 'expo.out' }, 0);
    if (existe('.enf-t')) tl.fromTo('.enf-t', { scale: 1.12 }, { scale: 1, duration: 0.35, ease: P }, 0.05);
    tl.to('#gancho', { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, Math.max(0.1, D.gancho.fim - 0.3));
  }

  // telas livres registram aqui a própria animação: window.__telaLivre['t03'] = function (tl, ctx) {...}
  var livres = window.__telaLivre || {};

  // telas: entram ~4 quadros antes da palavra, de 94% com leve desfoque
  D.telas.forEach(function (t) {
    tl.set(t.sel, { visibility: 'visible' }, t.entrada);
    if (t.entradaPropria) tl.set(t.sel, { opacity: 1 }, t.entrada);
    else tl.fromTo(t.sel, { opacity: 0, y: 26, scale: 0.94, filter: 'blur(8px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: P }, t.entrada);
    if (t.tipo === 'midia' && existe(t.sel + ' .midia-conteudo')) {
      // a mídia nunca fica parada: aproximação lenta durante todo o tempo no ar
      tl.fromTo(t.sel + ' .midia-conteudo', { scale: 1 }, { scale: 1.06, duration: Math.max(0.5, t.sai - t.entrada), ease: 'none' }, t.entrada);
    }
    if (t.tipo === 'livre' && typeof livres[t.id] === 'function') {
      livres[t.id](tl, { sel: t.sel, el: document.querySelector(t.sel), entrada: t.entrada, entra: t.entra, sai: t.sai, duracao: t.sai - t.entrada });
    }
    t.itens.forEach(function (it) {
      tl.set(it.sel, { opacity: 0 }, 0);
      tl.fromTo(it.sel, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: P }, it.t);
    });
    if (t.barra) {
      tl.set(t.barra.sel, { width: t.barra.de + '%' }, 0);
      tl.to(t.barra.sel, { width: t.barra.para + '%', duration: 0.6, ease: 'power2.inOut' }, t.barra.t);
    }
    if (t.tipo === 'prompt') {
      var pws = document.querySelectorAll(t.sel + ' .pw');
      var rws = document.querySelectorAll(t.sel + ' .rw');
      tl.set(pws, { opacity: 0 }, 0);
      tl.set(rws, { opacity: 0 }, 0);
      var passoP = Math.min(0.06, 0.9 / Math.max(1, pws.length));
      pws.forEach(function (w, k) { tl.set(w, { opacity: 1 }, t.entrada + 0.25 + k * passoP); });
      var inicioR = t.entrada + 0.35 + pws.length * passoP;
      var passoR = Math.min(0.07, Math.max(0.02, (t.sai - inicioR - 0.5) / Math.max(1, rws.length)));
      rws.forEach(function (w, k) { tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.12 }, inicioR + k * passoR); });
    }
    if (t.tipo === 'checklist') {
      // contador sobe junto com cada item marcado
      tl.set(t.sel + ' .chk-n', { opacity: 0 }, 0);
      tl.set(t.sel + ' .chk-zero', { opacity: 1 }, 0);
      tl.set(t.sel + ' .chk-v', { scale: 0, transformOrigin: '50% 50%' }, 0);
      t.itens.forEach(function (it, k) {
        var tk = it.t + 0.12;
        tl.fromTo(t.sel + ' #' + t.id + '-v' + k, { scale: 0 }, { scale: 1, duration: 0.22, ease: 'back.out(2.6)' }, tk);
        tl.set(k === 0 ? t.sel + ' .chk-zero' : t.sel + ' #' + t.id + '-n' + (k - 1), { opacity: 0 }, tk);
        tl.set(t.sel + ' #' + t.id + '-n' + k, { opacity: 1 }, tk);
        tl.fromTo(t.sel + ' #' + t.id + '-n' + k, { scale: 1.25 }, { scale: 1, duration: 0.25, ease: 'expo.out' }, tk);
      });
    }
    if (t.tipo === 'numero') tl.fromTo(t.sel + ' .num-grande', { scale: 1.14 }, { scale: 1, duration: 0.5, ease: 'expo.out' }, t.entra);
    if (!t.entradaPropria) tl.to(t.sel, { opacity: 0, y: -24, scale: 0.97, filter: 'blur(6px)', duration: 0.35, ease: 'power2.in' }, t.sai);
    tl.set(t.sel, { visibility: 'hidden' }, t.sai + 0.36);
  });

  // efeitos de cena (kit/efeitos): cada um registra window.__efeito['<nome>'] = function (tl, c) {...}
  // e anima só dentro da própria cena. Ao fim da cena, o rosto volta ao normal.
  var efeitos = window.__efeito || {};
  if ((D.efeitos || []).length) {
    tl.set('#cam', { scale: 1, rotation: 0, x: 0, clipPath: 'none', filter: 'none', borderRadius: 0 }, 0);
    tl.set('#take', { scale: 1, x: 0, y: 0, filter: 'none' }, 0);
  }
  (D.efeitos || []).forEach(function (e) {
    var camadas = ['#ef-' + e.id + '-fundo', '#ef-' + e.id + '-atras', '#ef-' + e.id + '-frente'];
    tl.set(camadas, { visibility: 'hidden' }, 0);
    tl.set(camadas, { visibility: 'visible' }, e.inicio);
    if (e.recorte) tl.set(e.recorte, { opacity: 0 }, 0);
    var anima = efeitos[e.nome];
    if (typeof anima === 'function') {
      anima(tl, {
        id: e.id, nome: e.nome, inicio: e.inicio, fim: e.fim, golpe: e.golpe, dur: e.fim - e.inicio, p: e.p || {}, marca: e.marca || {},
        fundo: document.querySelector(camadas[0]), atras: document.querySelector(camadas[1]), frente: document.querySelector(camadas[2]),
        sel: { fundo: camadas[0], atras: camadas[1], frente: camadas[2], cam: '#cam', zoom: '#zoom', take: '#take', sombra: '#sombra-rosto' },
        recorte: e.recorte, foto: e.foto, fundoSemPessoa: e.fundoSemPessoa, pessoa: e.pessoa || { topo: 780, esquerda: 320, direita: 800, medida: false },
      });
    }
    tl.set(camadas, { visibility: 'hidden' }, e.fim);
    // efeito só roda com o rosto cheio (faixa 0), onde o #cam fica em y 0
    tl.set('#cam', { scale: 1, rotation: 0, rotationX: 0, rotationY: 0, transformPerspective: 0, x: 0, y: 0, clipPath: 'none', filter: 'none', borderRadius: 0, transformOrigin: '540px 960px' }, e.fim);
    tl.set('#take', { scale: 1, x: 0, y: 0, filter: 'none', clipPath: 'none', transformOrigin: '50% 50%' }, e.fim);
    tl.set('#sombra-rosto', { opacity: 1 }, e.fim);
    if (e.recorte) tl.set(e.recorte, { opacity: 0, filter: 'none', clipPath: 'none', scale: 1, rotation: 0, x: 0, y: 0 }, e.fim);
  });

  // série numerada: o número e o nome trocam a cada item, a barra enche um segmento por vez
  if (D.serie && existe('#serie')) {
    var S = D.serie;
    tl.set('#serie', { opacity: 0, visibility: 'hidden' }, 0);
    tl.set('.serie-num, .serie-nome', { opacity: 0 }, 0);
    tl.set('.serie-seg', { '--enche': 0 }, 0);
    tl.set('#serie', { visibility: 'visible' }, S.itens[0].em);
    tl.fromTo('#serie', { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.35, ease: P }, S.itens[0].em);
    S.itens.forEach(function (it, k) {
      if (k > 0) {
        tl.to(['#serie-n' + (k - 1), '#serie-i' + (k - 1)], { opacity: 0, y: -14, duration: 0.16, ease: 'power2.in' }, it.em - 0.08);
      }
      tl.fromTo(['#serie-n' + k, '#serie-i' + k], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.26, ease: P }, it.em + 0.04);
      tl.to('#serie-s' + k, { '--enche': 1, duration: 0.35, ease: 'power2.out' }, it.em);
    });
    // tela no alto (cartão, lista, checklist...) ocupa o mesmo lugar: a série sai e volta depois
    D.telas.forEach(function (t) {
      if (t.sai <= S.itens[0].em || t.entrada >= S.fim) return;
      tl.to('#serie', { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, Math.max(S.itens[0].em, t.entrada - 0.05));
      if (t.sai + 0.4 < S.fim - 0.3) tl.to('#serie', { autoAlpha: 1, duration: 0.25, ease: P }, t.sai + 0.4);
    });
    tl.to('#serie', { opacity: 0, y: -18, duration: 0.3, ease: 'power2.in' }, Math.max(S.itens[S.itens.length - 1].em + 0.5, S.fim - 0.3));
    tl.set('#serie', { visibility: 'hidden' }, S.fim + 0.05);
  }

  // pedido no fim
  if (D.cta && existe('#cta-selo')) {
    tl.set('#cta-selo', { visibility: 'visible' }, D.cta.em);
    tl.fromTo('#cta-selo', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, D.cta.em);
    tl.to('#cta-selo', { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, D.cta.em + 0.8);
  }

  // legenda palavra a palavra: a primeira já está no quadro 0
  D.legendas.forEach(function (g, gi) {
    tl.set('#' + g.id, { opacity: 1, visibility: 'visible' }, g.inicio);
    g.palavras.forEach(function (p, k) {
      if (gi === 0 && k === 0) {
        tl.set('#' + p.id, { opacity: 1, y: 0, filter: 'blur(0px)' }, 0);
        return;
      }
      tl.fromTo('#' + p.id, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.14, ease: 'power2.out' }, p.t);
    });
    tl.set('#' + g.id, { opacity: 0, visibility: 'hidden' }, g.fim);
  });

  tl.set({}, {}, D.duracao);
  window.__timelines = window.__timelines || {};
  window.__timelines['main'] = tl;
})();
