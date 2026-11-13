# Regras de produção

São 53 regras. Elas saíram de um Reel real que precisou de 9 versões para chegar a 8,7 de 10 no revisor independente. Cada regra aqui é um erro que já aconteceu e custou uma rodada. Seguindo todas, o vídeo chega perto dessa nota em 1 ou 2 rodadas.

Como usar:
- Leia tudo antes de escrever um roteiro ou montar um vídeo.
- Os números são os mesmos do kit (`kit/scripts/lib/regras.mjs`). Se um número daqui e um do kit discordarem, vale o do kit, e isso é um defeito a relatar.
- Onde diz "o kit confere", existe um comando que reprova sozinho. Onde não diz, quem confere é você e o revisor.
- O molde do vídeo já traz o ritmo, o zoom, a faixa, a legenda e o som certos. Ele é o ponto de partida: melhore quando a cena pedir, com tela livre, gravação de tela e o repertório de `guias/tela-livre.md`. Quem segura o nível é o avaliador (regra 53), não a forma.
- As regras travam três coisas: as decisões do aluno, a verdade e o resultado (o que aparece no vídeo). Nenhuma regra trava o jeito de você criar.

## 1. Pauta e verdade

**1. Uma ideia por vídeo.**
Porquê: duas ideias dividem a atenção e nenhuma fica. Se o roteiro tem duas, são dois vídeos.

**2. A pauta nasce da dor do público, nas palavras dele.**
Use `publico.dores` do briefing e as dúvidas que os clientes do aluno fazem. Nunca nasça do que é fácil de mostrar.
Porquê: tema que nasce da ferramenta fala de quem faz o vídeo, não de quem assiste. O público sente e rola.

**3. Toda pauta tem uma premissa escrita e uma prova.**
Premissa é o que precisa ser verdade sobre o público para o vídeo funcionar ("quem começa dieta na segunda larga no meio da semana"). Prova é um item de `provas[]` ou a confirmação do aluno (linha "Para ser verdade" no cartão do P-02). Sem prova, a pauta é hipótese: só é mostrada com a linha "Para ser verdade" no cartão, e só é a recomendada quando nenhuma das 3 tem prova.
Porquê: checar só o fato fácil (uma data, uma lei) e não a premissa já derrubou um gancho inteiro. A notícia era verdadeira; o público é que não vivia aquilo.

**4. O derrubador de premissa roda antes de o aluno ver as pautas.**
Skill `avaliar`, tipo `premissa`. Pauta derrubada não é mostrada.
Porquê: quem escreveu a pauta não enxerga o furo dela.

**5. Teste dos 30 segundos.**
Pergunte: "a pessoa conseguiria isso sozinha em 30 segundos, sem o vídeo?". Se sim, a pauta não serve. O vídeo precisa entregar algo que ela não faria sozinha: um jeito, um atalho, um erro que ela não vê.
Porquê: tutorial óbvio foi barrado por "qualquer um faz isso".

**6. Mostrar, não afirmar.**
Cada promessa aparece acontecendo na tela: a lista se montando, o antes e o depois, o passo sendo feito.
Porquê: afirmação sem prova é propaganda. Demonstração é conteúdo.

**7. Número de verdade, redondo e sem fonte na tela.**
"7 de cada 10" vale. O número exato e a origem não aparecem no vídeo. A origem fica anotada fora da tela (`provas[].origem` e o campo `origem` da tela `numero`, que nunca é exibido). Sem prova com número, o roteiro não usa número. O kit confere: `numero` sem `origem` reprova.
Porquê: número exato soa inventado e número com fonte vira aula. Número inventado destrói a confiança de vez.

**8. Nunca inventar o que o nicho proíbe.**
Respeite `cuidados_do_nicho`: resultado de cliente, preço, depoimento e prazo nunca são inventados, nem como exemplo.
Porquê: um depoimento falso basta para o público e a profissão do aluno desconfiarem de tudo.

**9. A fala nunca afirma o que não aconteceu.**
Nada de "meu cliente me mandou isso hoje" se não mandou. Use pergunta: "já ouviu essa?".
Porquê: a pergunta prende igual e não mente.

**10. Palavras do aluno são lei.**
Nada de `palavras_proibidas` e nada de `marcas_proibidas`. Cada `termos_obrigatorios` trocado (`evitar` vira `usar`) na fala, na tela e na legenda. O kit confere a tela com `checar-marca`.
Porquê: o aluno responde pela profissão dele. Uma palavra proibida pode render reclamação no conselho da classe.

## 2. Gancho

**11. Abrir pelo problema de quem assiste ou pelo resultado visível no quadro 0.**
Nunca por biografia, apresentação, "oi", nome, anos de profissão ou "neste vídeo".
Porquê: credencial não segura ninguém no primeiro segundo. O vídeo começa na frase que você normalmente diria no sexto segundo.
Gancho em primeira pessoa (confissão, tropeço, bastidor, recibo) só passa se a mesma frase já mostrar o que quem assiste ganha. Faça o **teste do dedo**, no escrito e na fala: alguém que não conhece quem fala pararia de rolar lendo ou ouvindo só essa frase? Se ela fala só de quem grava, troque. Quem decide é você, pelo sentido da frase, não por uma palavra do começo.
Exemplo: "Meu primeiro Reel levou nove versões" é sobre quem grava, e a pessoa pula. "Não editei esse Reel. Escrevi três frases." mostra o resultado e deixa a pergunta "como?".

**12. A fala do gancho cabe em 3 segundos.**
A 2,75 palavras por segundo, são no máximo 8 palavras. O kit mede com `tempo-de-fala` (`gancho_s` ≤ 3).
Porquê: a decisão de ficar acontece nos 2 primeiros segundos.

**13. Dois ganchos ao mesmo tempo, com frases diferentes.**
O falado e o escrito. O escrito (`titulo_gancho.texto`) tem até 10 palavras e é lido antes de ser ouvido. O público (`titulo_gancho.publico`) tem até 12 palavras ou fica vazio.
Porquê: a maioria começa assistindo sem som. O escrito segura quem não ouve.

**14. O primeiro quadro já é o conteúdo.**
Título do gancho e primeira legenda no quadro 0. Nada de entrada, logo ou respiro. O quadro 0 é a capa: não pode ser escuro (o kit reprova brilho médio abaixo de 16).
Porquê: a pessoa decide no primeiro quadro, e a capa no perfil é esse quadro.

**15. A palavra-soco cai com um golpe de som até 2,5 s.**
Porquê: o golpe marca a virada e acorda quem está rolando sem prestar atenção.

**16. Três ganchos de fórmulas diferentes, escolhidos entre pelo menos seis.**
Escreva pelo menos 6 ganchos, cada um de uma fórmula diferente de `guias/ganchos.md`. Sozinho, descarte os que falham no teste do dedo (regra 11), falam só de quem grava, exageram o que aconteceu, prometem o que o produto não faz ou passam de 8 palavras. Mostre os 3 melhores. Não são 3 reescritas da mesma frase.
Quando o resultado é visível (vídeo pronto, tela, antes e depois), prefira fórmulas que o mostram no quadro 0, como a 6, a 13 e a 18: o resultado aparece antes de qualquer explicação, e a curiosidade é "como?".
O gancho escolhido vira o fio do roteiro e volta no fecho. Exemplo: "Escrevi três frases" vira "Frase um... Frase dois... Frase três..." e o pedido final repete "as três frases".
Nunca reescreva um gancho só para passar numa medida (`tempo-de-fala`, avaliador). A medida confere o gancho; quem escolhe é o teste do dedo.
Porquê: reescrever a mesma frase só troca palavra. Fórmulas diferentes dão escolha de verdade. Com 3 candidatos só, o primeiro gancho razoável vira o escolhido; com 6, o fraco cai antes de chegar ao aluno.

**17. Entrega concreta até o segundo 8.**
Até 8 s, quem assiste já recebeu algo útil ou viu algo acontecer.
Porquê: depois do gancho vem a pergunta "e daí?". Se ela não é respondida rápido, a pessoa sai.

## 3. Roteiro e fala

**18. Duração pelo briefing.**
`medio`: 30 a 45 s. `curto`: até 30 s. O QA aceita 15% para mais ou para menos sobre a duração da tabela de cenas.
Porquê: vídeo longo sem motivo perde gente no meio; curto demais não entrega.

**19. Frases curtas, do jeito que o aluno fala.**
Sem frase que precise ensaiar. Aplique `guias/naturalidade.md` em toda fala.
Porquê: frase escrita fica óbvia quando é dita em voz alta, e o aluno trava na gravação.

**20. Cada bloco de fala tem até 4 segundos de uma ideia.**
Porquê: bloco longo vira um rosto parado falando, e é ali que as pessoas saem.

**21. Um pedido só, de pouco esforço, no fim.**
Comentar uma palavra, salvar ou seguir. Um só. A palavra é única, sem espaço, dita e escrita (tela `cta`). O kit confere: `cta.palavra` com espaço reprova.
Porquê: dois pedidos valem o mesmo que nenhum. Pergunta de pouco esforço ("1, 2 ou 3?") puxa mais resposta que pergunta aberta.

**22. O fim volta ao gancho.**
A última frase ecoa uma palavra ou a cena do começo.
Porquê: quem assiste de novo emenda o fim no começo sem tropeço, e isso conta como retenção.

**23. O vídeo e a legenda não prometem mais do que entregam.**
Se a tela mostra uma lista, a fala não diz "todos". Se é uma demonstração, a legenda não diz "meus clientes".
Porquê: o público confere. Promessa maior que a entrega vira comentário negativo.

## 4. Direção de arte

**24. Referência é régua, não molde.**
Estude o nível dos vídeos de referência (ritmo, som, impacto). Nunca copie o layout, a legenda, os cartões ou a cara de ninguém. O revisor pergunta sempre: "parece cópia?". Sim reprova.
Porquê: um vídeo que copiou o layout de outro criador foi vetado na hora. Copiar faz o perfil parecer derivado.

**25. Direção de arte escrita por trecho antes de montar.**
Em `cenas.json`, `direcao_de_arte` diz o que domina a tela em cada trecho e por quê.
Porquê: sem isso o layout fica igual do começo ao fim, e a tela não acompanha o que importa.

**26. Rosto grande ou nada.**
Só dois formatos: cheio, ou dividido com a faixa, de ponta a ponta, sem moldura, com a cabeça a partir de y 790. Nunca bolha, janela ou cartão pequeno.
Porquê: quem vende é o rosto. Bolha e janela o reduzem a enfeite, e isso foi vetado com raiva.

**27. O rosto só some enquanto a prova roda.**
Use `rosto: nenhum` por 1,5 a 4 s, enquanto uma tela prova algo, e volte com o rosto inteiro. Com `briefing.rosto` = `sim`, rosto ausente em mais de 30% do vídeo gera aviso.
Porquê: a tela ganha o quadro quando prova; a pessoa volta quando a fala é o que importa.

**28. A faixa cresce com a importância da tela.**
Faixa cor de papel nas alturas 0, 35, 50 ou 100 (% da tela). Faixa 100 só com tela e por até 3,5 s. A troca leva de 0,45 a 0,6 s.
Porquê: o tamanho acompanha a importância. Faixa fixa deixa tudo com o mesmo peso.

**29. Uma direção de arte só.**
Cartões e textos nas cores e nas letras da marca (`minha-marca/marca.json`), no mesmo desenho do começo ao fim. O cartão ocupa a faixa, sem área morta embaixo. Tela de um app real tem a cara do app (regra 30); o que é do aluno tem a cara do aluno.
Porquê: quem assiste aprende a ler o cartão uma vez e depois só lê o conteúdo.

**30. A tela mostra o que a fala diz, com a cara real.**
Quando a fala cita um app, um site ou uma ação na tela, ela aparece: a gravação de tela do aluno, se houver; senão, a tela redesenhada a partir da referência real pesquisada (site oficial, print público, documentação), com nome, logo, cores e o jeito de mexer. Declare cada app em `apps_reais` do `cenas.json`, com a referência e o porquê: o `checar-marca` libera o nome e as cores dele neste vídeo. Logo real só do site oficial ou da Wikimedia.
Continua proibido: faixa ou etiqueta de "fictício" e "simulação" (chave `etiqueta` reprova), pessoa real, dado de cliente, número sem prova, resultado ou depoimento inventado, app que o aluno não usa só para enfeitar, e imitar a marca ou o visual de outro criador. Cor e nome de app famoso fora de `apps_reais` reprovam no `checar-marca`.
Porquê: no teste de 12/11/2026, a fala dizia "abro o Codex" e a tela mostrava um desenho genérico. Os três avaliadores pararam no segundo 8 pelo mesmo motivo: a prova ficou só na fala. A faixa de simulação entrega que é montado; o desenho genérico também.

**31. Tudo importante dentro da zona segura.**
y de 250 a 1500, 60 px da borda esquerda, 230 px da direita.
Porquê: fora disso ficam a legenda do post, o nome do perfil e os botões do Instagram.

**32. Tela no ar o tempo certo, com texto curto.**
Tela do molde: até 4 s, com os limites de palavras de `guias/camadas.md` (o kit marca de vermelho o texto que estourou). Tela livre e mídia: até 8 s, porque o movimento vem do próprio conteúdo, mas nada parado mais de 2 s (regra 33) e texto que dê para ler no tempo (regra 36).
Porquê: tela longa ou cheia de texto vira leitura, e ninguém lê Reel.

## 5. Ritmo e movimento

**33. Nada parado mais de 2 segundos.**
A cada 2 s muda algo: tela, zoom, texto ou som. O kit avisa na validação e reprova no QA.
Porquê: os dois pontos onde as pessoas iam embora eram 6 s só de rosto e um cartão parado 7 s.

**34. Zoom com função.**
Abertura de 1,26x para 1,1x em 0,8 s. Punch-in até 1,16x em 0,14 s, assentando em 1,1x em 1,0 s, na palavra de ênfase. Zoom lento até 1,1x em fala longa. Nunca passar de 1,1x com cartão na tela.
Porquê: zoom marca a ênfase e evita rosto parado. Acima de 1,1x o cartão sai da tela.

**35. Cartões chegam suaves e um pouco antes da palavra.**
Entrada de 0,5 a 0,7 s, saindo de 94% do tamanho com leve desfoque, uns 4 quadros antes da palavra que o nomeia.
Porquê: o olho chega na tela junto com o ouvido.

**36. Texto parado fica o tempo de ser lido.**
0,3 s por palavra, mínimo 0,8 s.
Porquê: texto que some antes de ser lido irrita; texto que fica demais para o ritmo.

**37. Transições conferidas quadro a quadro.**
Extraia quadros nas trocas e procure sobras esmaecidas da tela anterior, tela branca vazia, texto fora da zona segura e legenda sobre a boca.
Porquê: esses defeitos só aparecem parando o vídeo na troca. Assistindo, ninguém nota até o revisor apontar.

## 6. Legenda

**38. Legenda curta e no tempo da fala.**
1 a 3 palavras e até 22 caracteres por vez. Quebra na pontuação ou em pausa de 0,15 s ou mais. Aparece 0,05 s antes da palavra e some 0,12 s depois do fim.
Porquê: a maioria assiste sem som. Legenda longa disputa com o rosto.

**39. Legenda nunca sobre a boca.**
Com o rosto cheio, ela fica onde não tapa a boca e não sai da zona segura (regra 31): olhe um quadro do take e ponha em `legenda_rosto_y` o topo dela, de 250 a 1424. Abaixo da boca, se couber (a legenda tem ~75 px e termina até 1500). Se o rosto estiver baixo no quadro e a boca passar de ~1350, acima da cabeça. Confira nos quadros que ela não cobre o gancho escrito (até ~610 no começo), uma tela solta (250 a ~630) nem o selo do pedido (~1290 a 1370). Sem o campo, ela fica em 1424. Com faixa, acompanha a faixa no mesmo ritmo (35 em y 700, 50 em y 988, 100 em y 1424) e troca de cor: escura sobre o papel, clara sobre o rosto.
Porquê: legenda na boca tapa quem vende. Legenda que some na troca de faixa comia o começo das frases.

**40. Uma ênfase por cena, no máximo.**
Fonte de título, caixa alta, marca-texto na cor de destaque. O kit confere: mais de 1 ênfase por cena reprova.
Porquê: se tudo é destaque, nada é.

**41. Nomes, números e termos conferidos palavra por palavra.**
Antes de montar, compare a transcrição com o briefing e o roteiro, e corrija em `correcoes.json`.
Porquê: o transcritor erra nome próprio e número. Legenda errada passa descuido.

## 7. Som

**42. Todo movimento tem som; nem todo som tem movimento.**
Corte, entrada de tela e clique levam efeito. Efeito solto, sem nada mudando na tela, é ruído. O kit põe um som na chegada de cada tela e reprova se nenhum som bater a até 2 quadros do quadro em que ela aparece.
Porquê: o som faz o olho notar a mudança. Som sem motivo cansa.

**43. Golpes de virada mais altos que os outros efeitos.**
Volume 1,4 nas viradas contra 0,6 a 1,0 nos demais.
Porquê: a virada precisa ser sentida; os outros efeitos só acompanham.

**44. A voz manda.**
Voz em cerca de −20 LUFS antes do ganho final. Efeitos de 3 a 6 LU abaixo da voz.
Porquê: o vídeo é falado. Se o efeito compete com a voz, a mensagem se perde.

**45. Trilha 14 dB abaixo da voz.**
Aceito de 12 a 16 dB. A trilha só abaixa pela voz (ducking), nunca pelos efeitos.
Porquê: com 5 dB de distância, a trilha foi julgada "muito alta". Abaixar pelos efeitos faz a música pular.

**46. Celular não toca grave.**
O alto-falante corta abaixo de uns 300 Hz. Toda trilha é medida com filtro de 300 Hz aplicado duas vezes. Filtro permanente abaixo de 900 Hz é proibido (220 Hz nunca). O kit não mostra opção que some no celular.
Porquê: uma trilha só de grave sumiu no celular (−54 LUFS). Com o filtro em 900 Hz, ela apareceu.

**47. Final em −14 LUFS e sempre em estéreo.**
−14 LUFS com 0,5 de folga, pico até −1 dBTP. Nunca mono.
Porquê: o celular soma os dois canais. Um áudio mono medido em −14 tocava como −11, e só o ouvido automático percebeu.

**48. A trilha reage à fala.**
Abafa antes da virada, para 0,3 s antes do golpe, pode parar nas pausas e some aos poucos no fim (3,5 s). São as variantes `equilibrada`, `abafada` e `silencio`.
Porquê: a trilha que entra forte nas viradas deu a melhor nota. Música corrida chama atenção demais.

**49. O aluno escolhe a trilha ouvindo.**
Três versões do vídeo, cada uma com uma música, mais "sem música". Ouvir no celular. Só música CC0 ou CC BY, nunca repetida, com crédito nos metadados e na legenda do post.
Porquê: ouvir opções lado a lado decidiu mais rápido que qualquer pergunta. Música sem licença derruba o vídeo.

## 8. Gravação

**50. A gravação define o teto.**
Janela de frente ou a 45 graus do rosto, celular em pé na altura dos olhos, a 1,5 m com zoom 2x se der, nunca de baixo. Sem filtro. Um pouco de luz no fundo.
Porquê: filtro não salva gravação ruim; um filtro deixou o rosto roxo. Grande-angular de perto aumenta o nariz.

**51. Som limpo na gravação.**
Cômodo fechado, sem ventilador nem ar-condicionado. Microfone de lapela é o melhor; fone com fio vem depois; sem microfone, o celular a até 1 m da boca.
Porquê: ruído de fundo não sai na edição sem estragar a voz.

**52. Errou, para e repete o bloco.**
Fica 2 segundos quieto olhando para a lente e repete o bloco inteiro. Grava a primeira frase 3 vezes. Começa a falar logo, sem "oi".
Porquê: o silêncio de 2 s é onde o corte entra limpo. O gancho é o trecho mais importante, então tem mais tomadas para escolher.

## 9. Processo

**53. Ninguém dá nota ao próprio trabalho.**
Todo roteiro e todo vídeo passam pelo avaliador independente (skill `avaliar`) até 8,5 ou mais, em até 3 rodadas. A nota de quem fez não conta; diferença de 0,1 é ruído. Mexer só em som e texto leva a uns 8; para passar de 8,5 é preciso mexer na imagem (gancho, trechos parados, zoom). Depois que o aluno aprova a prévia, a imagem fica congelada e só muda com novo OK. Postagem nova e com dúvida vai como Reel de teste, uma vez só; nunca repostar.
Porquê: o mesmo roteiro levou 7,9 de quem o via sozinho e 5,5 lado a lado com outra ideia. Polir 8 vezes escondia um problema de conceito que só um olhar de fora viu.
