---
name: instalar-estudio
description: Instala o Estúdio de Reels no Mac ou no Windows, um programa por vez, pedindo licença ao aluno com textos prontos e simples. Cria o atalho logo no começo, faz o briefing curto do negócio, baixa os vídeos de exemplo e abre as 3 pastas. Também desinstala, quando o aluno pede. Use no primeiro uso, quando faltar o arquivo .ferramentas/instalacao.json na pasta do estúdio, quando o aluno pedir para instalar, reinstalar ou desinstalar, ou quando a verificação apontar algo faltando.
---

# Instalar o estúdio

O aluno é leigo. Ele não lê o que aparece na tela técnica, não digita nada e não precisa entender o que é cada programa. Você explica, pede licença e faz.

## Antes de tudo

- Textos: todos os textos desta skill (I-01 a I-15, os itens e os erros) estão em `instalar/mensagens.json`. Use-os **literalmente**, trocando só o que está entre `{{ }}`. `{{agente}}` é "Claude" ou "Codex", conforme quem você é.
- Pasta: rode tudo de dentro da pasta do estúdio (`~/estudio-de-reels` no Mac; `%USERPROFILE%\estudio-de-reels` ou `C:\EstudioDeReels\estudio-de-reels` no Windows). Os programas ficam em `.ferramentas`, dentro dela.
- Sistema: descubra se é Mac, Windows com PowerShell ou Windows com Git Bash antes do primeiro comando.
- Saída: todo comando termina com uma linha JSON. Leia só ela. Nunca mostre nada técnico ao aluno.
- Retomada: se a pessoa fechou a janela e voltou (pelo atalho ou colando o texto de novo), siga daqui mesmo. O `plano` mostra o que já está `pronto`; o briefing continua da primeira pergunta sem resposta. Nunca recomece do zero.

### Como chamar o instalador

| Onde você roda | Instalador | Verificação |
|---|---|---|
| Mac | `bash instalar/instalar.sh <acao> [id] --agente <claude\|codex>` | `bash instalar/verificar.sh` |
| Windows, PowerShell | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 <acao> [id] --agente <claude\|codex>` | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/verificar.ps1` |
| Windows, Git Bash | o mesmo do PowerShell, com barra normal | o mesmo do PowerShell |

- No Windows, escreva sempre `instalar/instalar.ps1` com barra normal.
- `USE_O_INSTALADOR_DO_WINDOWS`: você rodou o `instalar.sh` no Windows. Sem falar nada, rode o mesmo pedido com a linha do Windows.

Ações: `checar`, `plano`, `passo <id>`, `segundo-plano <id>`, `status <id>`, `desinstalar` (só na seção "Desinstalar"). A ação `atualizar` existe, mas **nunca** rode nesta skill.

### As caixinhas de permissão

Todo passo da instalação faz o Claude Code ou o Codex mostrar uma caixinha pedindo licença. Antes de cada passo, diga em uma frase o que ele faz (é o I-04 ou o I-05).

Logo depois do I-01, diga a linha da caixinha em inglês do seu programa (CLAUDE.md, seção 5). No Claude, oriente uma vez a opção "Yes, allow all edits during this session", para as gravações do briefing não pedirem licença a cada resposta.

No Codex, siga a regra única do CLAUDE.md, seção 5:
- todo o instalador roda pedindo para sair da área protegida, o que também libera a internet. Use o texto do item (`anuncio_codex`) ou `CODEX-INTERNET`; para `atalho`, `CODEX-FORA-DA-AREA-ATALHO`; para `pastas`, `CODEX-FORA-DA-AREA-PASTAS`; para o `montador`, `CODEX-FORA-DA-AREA`;
- se o Windows mostrar a janela de alteração do Codex, diga o texto de `CODEX_UAC`.

Se o aluno recusar a caixinha, diga o texto de `COMANDO_RECUSADO` com a consequência do item.

## Passo a passo

### 1. Olhar o computador
1. Diga o I-01 e, na mesma mensagem, a linha da caixinha em inglês. Espere a resposta. Se for "Agora não", diga que tudo bem e que é só escrever "instalar o estúdio" quando quiser. Pare.
2. Rode `checar`. No Codex, já pedindo internet (texto `CODEX-INTERNET`, com "o que precisa para olhar o computador" no lugar do nome).
3. Para cada item de `problemas[]`, mostre o texto do código em `erros` (com `dados`) e siga as opções:
   - `INTERNET_BLOQUEADA_PELA_CAIXA`: a internet existe, mas a área protegida do programa barrou. Não fale de Wi-Fi. Diga o texto e rode `checar` de novo pedindo internet.
   - `SEM_INTERNET`: no Codex, primeiro rode `checar` de novo pedindo internet, sem falar nada. Só se falhar de novo, mostre o texto (que fala do Wi-Fi).
   - `POUCO_ESPACO`: espere o aluno liberar e rode `checar` de novo. "Me ajude a achar o que apagar": explique, sem nada técnico, onde costumam estar os arquivos grandes (vídeos antigos na pasta Filmes ou Vídeos, Downloads, Lixeira).
   - `PASTA_NA_NUVEM` e `NOME_COM_ACENTO`: com o OK do aluno, rode `mudar-pasta` e continue da pasta do campo `para`.
   - `SISTEMA_ANTIGO`: pare a instalação com o texto. Ele cobre Mac antigo, Windows antigo e Windows 10 em computador ARM (que precisa do Windows 11).
   - `POUCA_MEMORIA`, `MAC_INTEL_PRAZO`: só avise e siga.
4. Sem problemas que travem, diga o I-02.

### 2. Mostrar o plano
1. Rode `plano`. Monte o I-03 (8 programas só no Windows com Claude, por causa do Git; senão 7). A pasta e o atalho não entram na contagem.
2. Espere a escolha: "Pode instalar tudo" (modo tudo) ou "Um por um" (modo um por um). Guarde o modo e passe `--modo tudo` ou `--modo um_por_um` em todos os comandos daqui em diante.

### 3. Pasta e atalho, primeiro
Estes dois vêm antes dos programas: se a janela fechar no meio, a pessoa volta pelo atalho.
1. `passo pasta`. Sem contador: diga só "Pronto: pasta do estúdio criada."
2. Diga o I-11 e rode `passo atalho`. Ele cria, na Área de Trabalho, o "Abrir o Estúdio" (abre o assistente já na pasta certa) e o "Estúdio de Reels" (abre a pasta dos vídeos). O caminho do programa é descoberto pelo próprio instalador, dentro desta sessão.
   - `ATALHO_NEGADO_PELO_MAC`: o Mac barrou a Área de Trabalho. Diga o texto (ele mostra o caminho Ajustes > Privacidade e Segurança > Arquivos e Pastas > Terminal > Mesa) com as opções "Tentar de novo ★" e "Seguir sem atalho". "Tentar de novo": rode `passo atalho` de novo. "Seguir sem atalho": siga e, no fim, ensine a voltar do jeito que abriu hoje.
3. Na mesma mensagem do I-11, diga: "Se a janela fechar sem querer, clique em Abrir o Estúdio ou cole o mesmo texto de novo: eu continuo de onde parou."

### 4. Os programas, um de cada vez
Na ordem: `python`, `node`, `ffmpeg`, `baixador`, `montador`.

Para cada passo com estado `falta`:
1. Modo tudo: diga o I-04 com o `nome` e a `frase` do item (no Codex, o `anuncio_codex`). Modo um por um: diga o I-05 e espere.
2. Se o aluno recusar: diga o I-06 com a `consequencia` do item. Nos obrigatórios (`node`, `ffmpeg`, `montador`), a opção 2 é "Parar a instalação por agora". Se ele parar, diga que é só escrever "instalar o estúdio" depois.
3. Rode `passo <id>`.
4. `ok:true` (inclusive `JA_PRONTO`): diga o I-07. O `{{i}}` é a posição do programa na lista do I-03 (Python é 1, Node é 2, e assim por diante) e o `{{n}}` é o mesmo número do I-03. Nunca conte a pasta nem o atalho.
5. `ok:false`: veja o `codigo` em `erros`. Se `acao_automatica` for `tentar_de_novo` ou o texto disser "automático", rode o passo de novo uma vez sem perguntar. Se falhar de novo, mostre o texto e as opções.

Passos com estado `pronto`: pule sem falar nada. Passos `nao_suportado`: diga o texto do código (`OUVIDO_NAO_SUPORTADO`) e siga.

### 5. Os ouvidos em segundo plano, e o briefing
1. Rode `segundo-plano fala` e `segundo-plano ouvido` (pule o ouvido se o `plano` disse `nao_suportado`).
2. Diga o I-08.
3. Se algum responder `iniciado:false`, rode `passo <id>` em primeiro plano depois do briefing, avisando antes: "Agora vou baixar o {{nome}}. Leva uns {{N}} minutos."
4. Rode a skill `minha-marca`, no modo instalação: só as 10 perguntas da instalação (B1, B3, B4, B5, B7, B8, B9, B16, B18, B19), o resumo e `./estudio marca`.
5. **Andamento sem caixinha.** Nunca rode `status` durante o briefing. Só entre uma parte e outra do briefing, leia com a ferramenta de leitura de arquivo `.ferramentas/estado/fala.json` e `.ferramentas/estado/ouvido.json` (campo `estado`: `rodando`, `pronto` ou `erro`, e o `codigo`). Ler arquivo não gera caixinha. Erro: siga o código depois do briefing. Não interrompa o briefing para falar de progresso.

### 6. Git (só Windows com Claude)
Diga o I-09. Se "Instalar", rode `passo git`. Falhou ou pulou: tudo bem, siga. Com Codex ou no Mac, pule este passo sem falar.

### 7. Referências e pastas
1. Calcule o tamanho num lugar só: some os `duracao_s` de `1-referencias/links.json`, divida por 60 e multiplique por 15 (uns 15 MB por minuto de vídeo). Arredonde para cima, de 10 em 10. Esse é o `{{M}}`; `{{N}}` é a quantidade de exemplos. Use este número no I-10 e em qualquer outro texto que fale do tamanho dos exemplos, mesmo que o texto traga outro número.
2. Diga o I-10. Se "Pode baixar", rode `passo referencias`.
3. Se o download falhar ou vier o aviso `PEDE_LOGIN` (ou outro), diga uma frase só: "Os vídeos de exemplo não baixaram agora, mas eu já sei o nível que a gente busca." e siga. O estúdio usa a régua embutida (`guias/regua-embutida.md`). Nunca prenda o aluno por isso.
4. Rode `passo pastas`.
5. Diga o I-12, contando quantos vídeos ficaram em `1-referencias/`.

### 8. Esperar os ouvidos
Leia `.ferramentas/estado/fala.json` e `.ferramentas/estado/ouvido.json`. Se algum ainda estiver `rodando`, diga o I-13 (com o tempo, se o `progresso` permitir estimar) e confira de novo pelo `status` de tempos em tempos. Avise quando acabar. Erro: `FALA_FALHOU` ou `OUVIDO_FALHOU`, com as opções.

### 9. Verificação final
1. Rode a verificação final (`verificar.sh` ou `verificar.ps1`).
2. `ok:true`: diga o I-14 com `prontos` e `total` e, na mesma mensagem, o aviso da tela de confiança (CLAUDE.md, seção 5): "Amanhã, na primeira vez, o programa pergunta em inglês se você confia na pasta. Aperte Enter na opção 1, que começa com Yes. Se escolher No, ele fecha."
3. `ok:false`: diga o I-15, listando em palavras simples os itens com `ok:false`. "Tentar de novo": rode `passo <id>` de cada item que falhou (com I-04 ou I-05) e verifique de novo.

## Desinstalar

Quando o aluno pedir "desinstalar o estúdio":
1. Rode `desinstalar` (sem `--confirmar`). Ele só diz o que seria apagado (`apagaria`, `tamanho_mb`) e o que fica (`fica`).
2. Diga: "Vou apagar os programas do estúdio (uns {{tamanho_mb}} MB) e os atalhos da Área de Trabalho. Os seus vídeos, a sua marca e os seus projetos ficam na pasta estudio-de-reels. Posso apagar?" com as opções "Pode apagar" e "Não, deixa como está ★".
3. Só com "Pode apagar": rode `desinstalar --confirmar`. `ARQUIVO_EM_USO`: um ouvido ainda está baixando ou um arquivo está aberto; diga o texto do código e espere o "pronto".
4. Diga: "Pronto. Apaguei os programas e os atalhos. Os seus vídeos continuam na pasta estudio-de-reels. Para instalar de novo, é só escrever: instalar o estúdio."

Nunca apague a pasta do estúdio nem `minha-marca/`, `projetos/`, `1-referencias/`, `2-videos-brutos/` ou `3-videos-prontos/`, nem quando desinstalar.

## Regras

- Nunca rode `atualizar`.
- Nunca apague `minha-marca/`, `projetos/`, `1-referencias/`, `2-videos-brutos/` nem `3-videos-prontos/`.
- Nunca instale nada fora do instalador: nada de Homebrew, winget (a não ser o passo `git`), pip, npm ou download avulso.
- Nunca peça senha. Nenhum passo precisa.
- Nunca mostre comando, caminho técnico ou log ao aluno, a não ser que ele peça.
- Um passo por mensagem. O aluno nunca fica sem saber o que está acontecendo.
- Se algo der errado duas vezes e você não entender, use o texto de `DESCONHECIDO` e chame a skill `consertar`.

## Saídas

- `.ferramentas/instalacao.json` dentro da pasta do estúdio (o instalador escreve).
- `minha-marca/briefing.json` e `minha-marca/marca.json` (pela skill `minha-marca`).
- Atalhos "Abrir o Estúdio" e "Estúdio de Reels" na Área de Trabalho, vídeos de exemplo em `1-referencias/` (se baixaram), 3 pastas abertas.

## Onde você para e pergunta

I-01, I-03, I-05 e I-06 (modo um por um, ou recusa), I-09, I-10, as 10 perguntas do briefing, e os erros que têm opções. Na desinstalação, a confirmação. Nada mais.
