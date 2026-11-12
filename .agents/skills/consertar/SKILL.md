---
name: consertar
description: Descobre e conserta o que deu errado no estúdio - programa faltando, comando que falhou duas vezes, pouco espaço, arquivo sumido - sem pedir ao aluno para ler log ou digitar comando. Use quando o aluno disser "deu erro", "travou", "não funciona", "sumiu", ou quando um comando do estúdio devolver ok falso duas vezes seguidas.
---

# Consertar

O aluno não sabe o que é log, terminal ou caminho. Ele sabe que "não funcionou". Você descobre o motivo, conserta e explica em 1 ou 2 frases.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON).

## Passo a passo

### 1. Acalmar e olhar
Diga uma frase só: "Vou olhar o que aconteceu. Não precisa fazer nada." E rode a verificação:

| Onde você roda | Comando |
|---|---|
| Mac | `bash instalar/verificar.sh` |
| Windows (PowerShell ou Git Bash) | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/verificar.ps1` |

No Codex, a verificação e todo passo do instalador rodam pedindo para sair da área protegida (CLAUDE.md, seção 5).

Se nem o comando de verificação rodar (pasta do estúdio sumiu ou foi movida), diga: "Não achei a pasta do estúdio no lugar de sempre. Você moveu ou renomeou a pasta estudio-de-reels?" e ajude a achar, sem apagar nada.

### 2. Entender o código
- Item da verificação com `ok:false`: é de instalação. O texto está em `instalar/mensagens.json` (`itens` e `erros`).
- Código vindo de um comando `./estudio`: é do kit. O texto e a `acao` estão em `kit/mensagens.json`.
- Código que não está em nenhum dos dois: use `DESCONHECIDO`.

### 3. Consertar instalação
Para cada item que falhou:
1. Avise com o I-04 (ou pergunte com o I-05, se o aluno escolheu "um por um" na instalação).
2. Rode o passo:
   - Mac: `bash instalar/instalar.sh passo <id> --agente <claude|codex>`
   - Windows (PowerShell ou Git Bash): `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1 passo <id> --agente <claude|codex>`
3. Siga o código do resultado como na skill `instalar-estudio` (tentar de novo uma vez sozinho quando o texto diz "automático").
4. Rode a verificação de novo.

Se faltar o arquivo `.ferramentas/instalacao.json` dentro da pasta do estúdio, rode a skill `instalar-estudio` inteira: a instalação é idempotente e pula o que já está pronto.

Códigos de instalação que pedem cuidado:
- `USE_O_INSTALADOR_DO_WINDOWS`: o instalador do Mac foi chamado no Windows (Git Bash). Não é defeito. Sem falar nada, rode o mesmo pedido com `powershell.exe -NoProfile -ExecutionPolicy Bypass -File instalar/instalar.ps1`.
- `INTERNET_BLOQUEADA_PELA_CAIXA`: a internet funciona, mas a área protegida do programa barrou a conexão. Nunca culpe o Wi-Fi. Diga o texto do código e rode de novo pedindo internet (no Codex, com o texto `CODEX-INTERNET`).
- `SEM_INTERNET` no Codex: primeiro rode de novo pedindo internet, sem falar nada. Só se falhar de novo, mostre o texto do Wi-Fi.
- `ATALHO_NEGADO_PELO_MAC`: o Mac não deixou pôr o atalho na Área de Trabalho. Diga o texto (Ajustes > Privacidade e Segurança > Arquivos e Pastas > Terminal > Mesa) com as opções "Tentar de novo ★" e "Seguir sem atalho". "Tentar de novo": rode `passo atalho`.
- `SISTEMA_ANTIGO`: o computador não roda o estúdio (inclui Windows 10 em computador ARM, que precisa do Windows 11). Diga o texto e não tente de novo.

### 4. Consertar o kit
Siga a `acao` do código em `kit/mensagens.json`. Casos comuns:
- Erro de validação (exit 2: `CENAS_INVALIDAS`, `TELA_ESTOUROU`, `TRECHOS_INVALIDOS`, `QA_REPROVADO`, `MARCA_REPROVADA`): não é defeito do estúdio. Volte à skill que estava rodando e corrija o arquivo pela causa.
- `CHROME_NAO_ABRIU` ou `RENDER_FALHOU`: rode o passo `montador` do instalador (no Codex, fora da área protegida) e tente o comando de novo.
- `MODELO_FALA_FALTA` ou `TRANSCRICAO_FALHOU`: rode o passo `fala` do instalador.
- `OUVIDO_INDISPONIVEL`: siga sem o ouvido; o vídeo sai igual.
- Download de exemplo falhou (`PEDE_LOGIN`, `DOWNLOAD_REFERENCIA_FALHOU`): não é defeito. Diga uma frase e siga com `guias/regua-embutida.md`.
- `ESPELHO_DIFERENTE`: as instruções do estúdio estão diferentes entre as cópias. Diga ao aluno: "Algum arquivo do estúdio foi mexido. Melhor pedir ajuda no suporte do curso." Não edite as instruções.

### 5. Pouco espaço
1. `./estudio espaco`.
2. Abaixo de 4 GB: `./estudio limpar --projeto P` nos projetos já entregues (etapa `postagem`, `medicao` ou `concluido`), do mais antigo para o mais novo, até passar de 4 GB. Ele só apaga sobras de montagem, nunca o vídeo gravado nem o final.
3. Se ainda faltar, diga ao aluno, sem comando, onde costumam estar arquivos grandes (vídeos antigos na pasta Filmes ou Vídeos, Downloads, Lixeira) e espere ele liberar.

### 6. Arquivo em uso
`ARQUIVO_EM_USO`: diga o texto do código e espere o "pronto".

### 7. Explicar
Em 1 ou 2 frases simples: o que houve e o que você fez. Exemplo: "O montador de vídeo tinha ficado pela metade. Instalei de novo e agora está funcionando." Depois volte ao que o aluno estava fazendo, do ponto onde parou.

### 8. Se nada resolver
Depois de duas tentativas sem sucesso no mesmo problema:
> Não consegui resolver sozinho. O problema é: {{explicação em uma frase}}. Quer que eu tente mais uma vez ou prefere pedir ajuda no suporte do curso?
> 1. Tentar mais uma vez ★
> 2. Vou pedir ajuda

Se ele for pedir ajuda, diga que ele pode mandar ao suporte a frase: "{{código}} no passo {{nome}}".

## Proibido

- Pedir para o aluno ler log, abrir o terminal, digitar comando ou abrir arquivo técnico.
- Mostrar log, caminho técnico ou código de erro, a não ser na frase para o suporte.
- Apagar `minha-marca/`, `projetos/`, `1-referencias/`, `2-videos-brutos/` ou `3-videos-prontos/`.
- Rodar `atualizar` ou `desinstalar` do instalador (desinstalar só a pedido do aluno, pela skill `instalar-estudio`).
- Instalar qualquer coisa fora do instalador.
- Editar `AGENTS.md`, `CLAUDE.md` ou as skills.

## Onde você para e pergunta

Só nos erros que têm opções, no "Arquivo em uso" e na pergunta do passo 8.
