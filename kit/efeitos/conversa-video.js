/* Pedido no chat, resposta em vídeo: o pedido do aluno se digita numa bolha, é enviado, e o take encolhe
   para virar a resposta do assistente, num cartão de vídeo dentro da conversa. No fim, volta à tela cheia.
   Determinístico: só tweens e sets na linha do tempo, nada de callback.
   Camadas: a bolha fica na frente (aparece já com o rosto cheio, sobre a parede); a janela do chat fica no
   fundo; a barra de progresso e os cantos redondos do cartão ficam em "atras" (dentro do #cam, encolhem
   junto com o take). O canto redondo é desenhado com a cor da janela: no render do HyperFrames o corte
   do vídeo não aceita canto redondo. */
(function () {
  window.__efeito = window.__efeito || {};
  // escapa para texto e para atributo (aspas também): o que o aluno escreve nunca vira HTML
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML.split('"').join('&quot;').split("'").join('&#39;'); };

  // o cartão do vídeo na conversa (o take inteiro encolhido); o zoom do kit (1,1) já está na conta
  var CARTAO = { scale: 0.36, x: -176, y: 0 };
  var RAIO = 72;       // canto do cartão, em px do quadro antes de encolher
  var NOMINAL = 3.45;  // duração do efeito completo; a ficha pede cena de 3,5 s ou mais, então os sons
                       // da ficha (em segundos fixos) batem com o movimento; o k < 1 só protege prévia fora da regra

  window.__efeito['conversa-video'] = function (tl, c) {
    var t0 = c.inicio;
    var k = Math.min(1, (c.dur - 0.05) / NOMINAL);
    var T = function (s) { return t0 + s * k; };
    var pedido = String(c.p.pedido || 'Faz meu vídeo').trim();
    var palavras = pedido.split(' ').filter(Boolean);

    c.fundo.innerHTML =
      '<div class="cv-base"></div><div class="cv-luz"></div>' +
      '<div class="cv-janela">' +
      '<div class="cv-topo"><span class="cv-avatar"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z"/></svg></span>' +
      '<span class="cv-nome"><b>Assistente</b><small><i></i>online</small></span><span class="cv-mais"><i></i><i></i><i></i></span></div>' +
      '<div class="cv-avatar cv-avatar-resp"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z"/></svg></div>' +
      '<div class="cv-tarefas">' + [0, 1, 2].map(function (n) {
        return '<div class="cv-tarefa"><span class="cv-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><i style="width:' + [170, 140, 190][n] + 'px"></i></div>';
      }).join('') + '</div>' +
      '</div>';

    c.atras.innerHTML =
      '<svg class="cv-cantos" viewBox="0 0 1080 1920" width="1080" height="1920">' +
      '<path d="M0 0H' + RAIO + 'A' + RAIO + ' ' + RAIO + ' 0 0 0 0 ' + RAIO + 'Z"/>' +
      '<path d="M1080 0V' + RAIO + 'A' + RAIO + ' ' + RAIO + ' 0 0 0 ' + (1080 - RAIO) + ' 0Z"/>' +
      '<path d="M1080 1920H' + (1080 - RAIO) + 'A' + RAIO + ' ' + RAIO + ' 0 0 0 1080 ' + (1920 - RAIO) + 'Z"/>' +
      '<path d="M0 1920V' + (1920 - RAIO) + 'A' + RAIO + ' ' + RAIO + ' 0 0 0 ' + RAIO + ' 1920Z"/></svg>' +
      '<div class="cv-player"><span class="cv-tempo">0:12</span><div class="cv-trilho"><i></i></div></div>';

    c.frente.innerHTML =
      '<div class="cv-envio"><div class="cv-bolha">' +
      '<b class="cv-cur"></b>' + palavras.map(function (w) { return '<span>' + esc(w) + '</span><b class="cv-cur"></b>'; }).join(' ') +
      '</div><div class="cv-visto">Enviado <svg viewBox="0 0 30 16"><path d="M2 8.5l4 4 8-9M12 12.5l1 0 13-9"/></svg></div></div>';

    var a = function (sel) { return c.sel.atras + ' ' + sel; };
    var q = function (sel) { return c.sel.fundo + ' ' + sel; };
    var f = function (sel) { return c.sel.frente + ' ' + sel; };

    var digita = T(0.15), envia = T(1.2), volta = T(2.95), fim = Math.min(c.fim, T(3.45));
    var passo = Math.min(0.06, (envia - 0.1 - digita) / Math.max(1, palavras.length));

    // 1. a bolha aparece sobre o vídeo cheio e o pedido se digita palavra a palavra
    tl.fromTo(f('.cv-bolha'), { scale: 0.6, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.8)' }, t0);
    tl.fromTo(f('.cv-bolha span'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out', stagger: passo }, digita);
    // o cursor anda junto: cada um aparece com a sua palavra e some quando vem a próxima
    var cursores = c.frente.querySelectorAll('.cv-cur');
    tl.set(cursores, { opacity: 0 }, t0);
    for (var n = 0; n < cursores.length; n++) {
      var de = n === 0 ? t0 + 0.1 : digita + (n - 1) * passo + 0.06;
      var ate = n === cursores.length - 1 ? envia : digita + n * passo + 0.06;
      tl.set(cursores[n], { opacity: 1 }, de);
      tl.set(cursores[n], { opacity: 0 }, ate);
    }

    // 2. envio: a bolha dá um pulo, aparece "Enviado" e o take encolhe para dentro da conversa
    tl.to(f('.cv-bolha'), { y: -10, duration: 0.12, ease: 'power2.out' }, envia);
    tl.to(f('.cv-bolha'), { y: 0, duration: 0.3, ease: 'back.out(3)' }, envia + 0.12);
    tl.fromTo(f('.cv-visto'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, envia + 0.05);
    tl.to(c.sel.sombra, { opacity: 0, duration: 0.25 }, envia);
    tl.fromTo(q('.cv-luz'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, envia);
    tl.fromTo(q('.cv-janela'), { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'expo.out' }, envia + 0.05);
    tl.fromTo(c.sel.cam,
      { scale: 1, x: 0, y: 0, filter: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))' },
      { scale: CARTAO.scale, x: CARTAO.x, y: CARTAO.y, filter: 'drop-shadow(0px 30px 40px rgba(0,0,0,0.28))', duration: 0.6, ease: 'expo.out' }, envia);
    // os cantos redondos e o player entram quando o cartão já assentou na janela
    tl.fromTo(a('.cv-cantos'), { opacity: 0 }, { opacity: 1, duration: 0.15 }, envia + 0.38);
    tl.fromTo(a('.cv-player'), { opacity: 0 }, { opacity: 1, duration: 0.25 }, envia + 0.45);
    tl.fromTo(a('.cv-trilho i'), { scaleX: 0 }, { scaleX: 0.8, duration: Math.max(0.3, volta - envia - 0.45), ease: 'none' }, envia + 0.45);
    tl.fromTo(q('.cv-avatar-resp'), { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, envia + 0.3);
    // as tarefas da resposta se marcam uma a uma
    tl.fromTo(q('.cv-tarefa'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power3.out', stagger: 0.18 * k }, envia + 0.45);
    tl.fromTo(q('.cv-ok'), { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.18 * k }, envia + 0.6);
    // o cartão respira enquanto a resposta "toca"
    tl.to(c.sel.cam, { scale: CARTAO.scale * 1.025, duration: Math.max(0.2, volta - envia - 0.6), ease: 'sine.inOut' }, envia + 0.6);

    // 3. volta: o chat some e o take cresce de novo para a tela cheia
    var dv = Math.max(0.2, fim - volta);
    tl.set(a('.cv-cantos'), { opacity: 0 }, volta);
    tl.to(a('.cv-player'), { opacity: 0, duration: 0.12 }, volta);
    tl.to([c.sel.frente, q('.cv-janela')], { opacity: 0, duration: dv * 0.45, ease: 'power2.in' }, volta);
    tl.to(c.sel.cam, { scale: 1, x: 0, y: 0, filter: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))', duration: dv, ease: 'power3.inOut' }, volta);
    tl.to(q('.cv-luz'), { opacity: 0, duration: dv }, volta);
    tl.to(c.sel.sombra, { opacity: 1, duration: dv * 0.4 }, volta + dv * 0.6);
    tl.set(c.sel.frente, { opacity: 1 }, c.fim);
    tl.set(c.sel.cam, { y: 0 }, c.fim);
  };
})();
