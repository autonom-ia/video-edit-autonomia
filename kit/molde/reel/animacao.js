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
    if (t.tipo === 'numero') tl.fromTo(t.sel + ' .num-grande', { scale: 1.14 }, { scale: 1, duration: 0.5, ease: 'expo.out' }, t.entra);
    if (!t.entradaPropria) tl.to(t.sel, { opacity: 0, y: -24, scale: 0.97, filter: 'blur(6px)', duration: 0.35, ease: 'power2.in' }, t.sai);
    tl.set(t.sel, { visibility: 'hidden' }, t.sai + 0.36);
  });

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
