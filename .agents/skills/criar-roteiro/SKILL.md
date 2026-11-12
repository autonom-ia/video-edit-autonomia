---
name: criar-roteiro
description: Monta com o aluno um vídeo que ele ainda vai gravar - pauta, gancho, roteiro revisado, plano das cenas e folha de gravação para o celular - parando só para ele escolher a pauta, o gancho e aprovar o plano. Use quando o aluno disser que quer gravar um vídeo, pedir ajuda com um roteiro, pedir ideia de vídeo ou perguntar sobre o que falar.
---

# Criar roteiro (caminho A)

O aluno decide 3 coisas: a pauta, o gancho e o plano das cenas. Nenhuma pergunta a mais. Todo o resto você faz em silêncio, com as regras já embutidas. A meta é o roteiro passar de 8,5 no avaliador antes de o aluno ver o plano.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. No Codex, siga a regra única do CLAUDE.md, seção 5, para saber quais pedem internet ou saída da área protegida. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`. `P` é o nome da pasta do projeto que o `novo-projeto` devolve.

## Leia antes (todas as vezes)

- `minha-marca/briefing.json` e, se existir, `minha-marca/aprendizados.md` (as regras deste perfil valem mais que as gerais).
- `guias/regras-de-producao.md` (as 53 regras), `guias/ganchos.md`, `guias/naturalidade.md`, `guias/camadas.md`.
- `guias/textos-do-estudio.md` (F-00 e P-02 a P-05).
- As réguas em `1-referencias/*/regua.md`. Se houver referência sem régua, rode a skill `estudar-referencias` antes, sem avisar. Se não houver nenhuma régua (nada baixou), use `guias/regua-embutida.md` e siga sem perguntar.

Se `minha-marca/briefing.json` faltar ou `./estudio marca` responder `BRIEFING_INCOMPLETO`, rode a skill `minha-marca` primeiro.

## Passo a passo

### 1. Abrir o projeto
Não pergunte nada antes das pautas. Se o aluno já disse o assunto, as pautas são sobre ele; senão, saem do briefing.

Rode `./estudio novo-projeto --titulo "<assunto em poucas palavras>" --caminho A`. Guarde `arquivos.projeto` como `P`. (Sem assunto dito, use `--titulo "ideias"`.)

### 2. As pautas
1. Gere 6 pautas a partir de `publico.dores`, `nicho.descricao`, `oferta` e dos aprendizados. Para cada uma: assunto, a dor que resolve, o que a pessoa ganha, premissa, prova (item de `provas[]` com origem, ou "hipótese"), teste dos 30 segundos, começo falado e escrito na tela.
2. Descarte, você mesmo, as que falham no teste dos 30 segundos ou dependem de inventar algo de `cuidados_do_nicho`.
3. Rode a skill `avaliar`, tipo `premissa`, com as que sobraram. Descarte as que caírem. Ajuste as "de pé com ajuste".
4. Mostre as 3 melhores no P-02. A recomendada (★) é a que tem prova. Se nenhuma tiver prova no briefing (o comum logo depois da instalação, quando `provas[]` está vazio), a ★ vai para a de premissa mais segura, sempre com a linha "Para ser verdade". Pauta sem prova no briefing leva no cartão a linha "Para ser verdade: {{premissa}}. É assim com os seus clientes?". Escolher essa pauta é confirmar a premissa. "Não é bem assim": volte às outras pautas. Assunto próprio ("ou me diga o seu assunto"): gere 3 pautas sobre ele, passe pelos passos 2 e 3 e mostre o P-02 de novo.
5. Grave `projetos/P/pauta.md` pelo molde `modelos/pauta.md`.
6. Rode `./estudio estado --projeto P --etapa gancho --gate pauta=<A|B|C> --resposta "<palavras do aluno>"`.

### 3. Os ganchos
1. Escreva pelo menos 6 ganchos, cada um de uma fórmula diferente de `guias/ganchos.md` que caiba na pauta. Fórmula de número só com prova. Resultado visível? Prefira fórmulas que o mostram no quadro 0, como a 6, a 13 e a 18.
2. Em silêncio, descarte os que falham no teste do dedo, falam só de quem grava, exageram ou passam de 8 palavras (regras 11 e 16). Nunca mude a frase só para passar numa medida.
3. Para os 3 melhores: fala de até 8 palavras e escrito de até 10, frases diferentes.
4. Diga o P-03. Recomende (★) o que faz quem não conhece quem fala parar de rolar. Na dúvida, o que mostra o resultado no quadro 0.
5. Rode `./estudio estado --projeto P --etapa roteiro --gate gancho=<n> --resposta "<palavras do aluno>"`.

### 4. O roteiro (em silêncio)
O gancho escolhido vira o fio do roteiro e volta no fecho.

1. Escreva `projetos/P/roteiro.md` pelo molde `modelos/roteiro.md`. Só a seção "Fala" usa linhas começadas por `> `, um bloco por linha.
2. Aplique `guias/naturalidade.md` em cada linha.
3. Rode `./estudio tempo-de-fala --arquivo projetos/P/roteiro.md` e confira:
   - `gancho_s` até 3;
   - `segundos` dentro de `duracao_alvo` (médio 30 a 45; curto até 30);
   - nenhum bloco acima de uns 4 s;
   - uma ideia só, sem biografia, sem apresentação;
   - entrega concreta até o segundo 8;
   - um pedido só, no fim, voltando ao gancho.
   Corrija e rode de novo até passar.

### 5. O avaliador do roteiro (em silêncio)
1. Rode a skill `avaliar`, tipo `roteiro`, rodada 1.
2. Abaixo de 8,5 ou "parece cópia" = sim: confira os fatos de cada problema, corrija, rode `tempo-de-fala` de novo e chame a rodada seguinte.
3. No máximo 3 rodadas. Se a terceira ficar abaixo de 8,5, diga o P-03b (em `guias/textos-do-estudio.md`). "Trocar o assunto": volte ao passo 2. "Seguir com este": continue.

### 6. O plano das cenas (em silêncio)
1. Escreva `direcao_de_arte` primeiro: o que domina a tela em cada trecho e por quê.
2. Escreva `projetos/P/cenas.json` pelo guia de `guias/camadas.md`, com tempos estimados a 2,75 palavras por segundo. Siga "Como pensar a tabela".
3. Escreva `projetos/P/cenas.md` pelo molde `modelos/cenas.md`, em palavras simples.
4. Rode `./estudio telas --projeto P`. Se voltar `CENAS_INVALIDAS` ou `TELA_ESTOUROU`, corrija cada item de `dados.problemas[]` e rode de novo. Olhe os PNGs de `projetos/P/telas/`.
5. Rode `./estudio amostras --tipo estilo --projeto P`. Ele gera as 3 imagens de estilo sem perguntar nada.
6. Rode `./estudio estado --projeto P --etapa cenas`.

### 7. GATE 1
1. Rode `./estudio pagina-de-aprovacao --projeto P`. Ela monta e abre no navegador uma página só, em letra grande, sem nada técnico: a fala, o que aparece escrito na tela e as 3 imagens de referência das cenas. **Nunca abra `roteiro.md`, `cenas.md` ou qualquer `.md` para o aluno.**
2. Diga o P-04.
3. "Quero mudar uma coisa": aplique a mudança, rode de novo só o que foi afetado (`tempo-de-fala`, `telas`, `amostras`) e depois `pagina-de-aprovacao` de novo, contando em uma frase o que mudou. Mudança de texto na fala que mexe no sentido: nova rodada do avaliador de roteiro, em silêncio.
4. "Trocar o estilo": rode `./estudio amostras --tipo estilo --projeto P` de novo e mostre.
5. "Aprovar": `./estudio estado --projeto P --gate cenas=aprovado --resposta "<palavras do aluno>"`.

### 8. A folha de gravação
1. Rode `./estudio folha --projeto P`. Ele gera o HTML e o PDF e abre o PDF.
2. Diga o P-05 e, logo depois, o F-00 no sentido do computador para o celular.
3. Rode `./estudio estado --projeto P --etapa gravacao`.

## Regras de escrita (resumo; o completo está nas 53 regras)

- Abrir pelo problema de quem assiste. Nunca "oi", nome, anos de profissão ou "neste vídeo".
- Fala do gancho até 8 palavras. Escrito até 10. Frases diferentes.
- Número só de `provas[]`, redondo, sem fonte na tela. Sem prova, sem número.
- Nada de `cuidados_do_nicho` inventado. Nada de `palavras_proibidas`. `termos_obrigatorios` trocados.
- A fala nunca afirma o que não aconteceu. Use pergunta.
- Um pedido só, de pouco esforço, com a palavra do briefing dita e escrita.
- Tela realista sem faixa de simulação, nome comum, sem marca de terceiro.

## Saídas

`projetos/P/`: `estado.json`, `pauta.md`, `roteiro.md`, `cenas.json`, `cenas.md` (só para você e o avaliador), a página de aprovação, `amostras/`, `telas/`, `folha-de-gravacao.html`, `folha-de-gravacao.pdf`, `revisor/`, `revisao-premissa-N.md`, `revisao-roteiro-N.md`.

## Onde você para e pergunta

P-02, P-03, P-04. E o P-03b, só se o roteiro não passar em 3 rodadas. Nada mais. Nunca pergunte "posso seguir?" depois de um gate aprovado.
