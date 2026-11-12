---
name: estudar-referencias
description: Baixa e estuda vídeos de referência para medir o nível que o vídeo do aluno precisa alcançar (ritmo, cortes, som, direção de arte), sem nunca copiar o desenho de ninguém. Use quando o aluno pedir para estudar referências, colar um link de vídeo, disser "olha esse vídeo", e, sem perguntar, dentro da criação de roteiro quando houver referência ainda não estudada.
---

# Estudar referências

Referência é régua, não molde. Você estuda o nível e escreve uma régua. Nunca copia layout, legenda, cartões, fonte, cores ou frases.

Comandos: no Mac e no Windows com Git Bash, `./estudio <comando>`. No PowerShell do Windows, `.\estudio.cmd <comando>`. Sempre de dentro da pasta do estúdio. Leia só a última linha (JSON) e traduza o `codigo` pelo `kit/mensagens.json`. No Codex, `referencias` pede internet e saída da área protegida (CLAUDE.md, seção 5).

**Nunca prenda o aluno por causa de um download.** Se nada baixar, diga uma frase e siga com a régua embutida (`guias/regua-embutida.md`).

## Leia antes

- `guias/pesquisar-referencias.md`: o método e o formato da régua.
- `1-referencias/links.json`: os exemplos que já vêm com o estúdio.
- `minha-marca/briefing.json`, campo `referencias[]`: os links que o aluno deu.

## Passo a passo

### 1. Ver o que já existe
- Cada pasta dentro de `1-referencias/` com `video.mp4` é uma referência baixada.
- Uma referência está estudada quando a pasta tem `regua.md`.
- Vídeos soltos que o aluno pôs direto em `1-referencias/` também contam: o `--estudar todas` cuida deles.

Se não houver nenhuma referência (nem baixada, nem no briefing, nem solta), pergunte uma vez:
> Quer usar os exemplos que já vêm, ou colar links de vídeos que você admira?
> 1. Usar os exemplos ★
> 2. Colar meus links

"Usar os exemplos": rode `./estudio referencias --baixar-exemplos`.

### 2. Baixar o que falta
- Para cada link novo (colado pelo aluno ou em `referencias[]` do briefing): `./estudio referencias --baixar <url>`. Antes, se estiver no Codex, avise que ele vai pedir para usar a internet.
- Aviso `PEDE_LOGIN`, `DOWNLOAD_REFERENCIA_FALHOU` ou outro erro de download: diga uma frase só ("Esse vídeo não baixou, mas eu já sei o nível que a gente busca.") e siga com os outros. Se nenhum baixar, use `guias/regua-embutida.md` como régua e pare aqui, sem perguntar nada.
- Só se o aluno insistir naquele vídeo: ele pode salvar o vídeo no celular e passar para o computador pelo F-00 de `guias/textos-do-estudio.md`, pondo o arquivo na pasta 1-referencias.
- Se o aluno colou o link agora e ainda não está no briefing, acrescente em `referencias[]` com `porque` (pergunte uma vez o que ele gosta no vídeo).

### 3. Medir
Rode `./estudio referencias --estudar todas`. Ele gera, em cada pasta, `quadros/`, `folha-de-quadros.jpg` e `nota-tecnica.json` (duração, cortes, volume e, se houver ouvido, a crítica de som).

### 4. Escrever a régua
Para cada pasta sem `regua.md`:
1. Abra e olhe a `folha-de-quadros.jpg` com atenção. Se precisar de detalhe, olhe os quadros soltos em `quadros/`.
2. Leia `nota-tecnica.json`.
3. Escreva `1-referencias/<pasta>/regua.md` no formato de `guias/pesquisar-referencias.md`, começando por "O que fazem melhor que nós".
4. Feche com "O que levar para o aluno": nível, não forma. Exemplo: "trocar algo na tela a cada 2 segundos", nunca "usar o cartão roxo igual ao dele".

### 5. Contar ao aluno (só quando ele pediu o estudo)
Em até 3 frases curtas, o que esse vídeo faz de melhor e o que vamos levar para o próximo vídeo dele. Sem número técnico. Se quiser mostrar, abra a folha de quadros com `./estudio abrir 1-referencias/<pasta>/folha-de-quadros.jpg`.

Quando rodar dentro de `criar-roteiro`, não diga nada: só escreva as réguas e siga.

## Regras

- Nunca copiar layout, legenda, cartões, fonte de assinatura, cores ou frases.
- Nunca julgar um vídeo sem olhar os quadros.
- Nunca pedir senha nem entrar na conta do Instagram do aluno.
- Nunca baixar em volume: só os links que o aluno deu e os exemplos da lista.
- Nunca mandar vídeo de referência para o avaliador.
- Nunca postar, enviar ou subir o vídeo de outra pessoa.

## Saídas

`1-referencias/<pasta>/` com `video.mp4`, `quadros/`, `folha-de-quadros.jpg`, `nota-tecnica.json` e `regua.md`. Sem nenhum vídeo baixado, nada é escrito: vale `guias/regua-embutida.md`.

## Onde você para e pergunta

Só "Quer usar os exemplos que já vêm, ou colar links de vídeos que você admira?", e só quando não houver nenhuma referência.
