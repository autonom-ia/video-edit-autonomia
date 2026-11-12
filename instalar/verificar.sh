#!/bin/bash
# Estúdio de Reels: doutor do Mac.
# Confere cada programa (Node, npm, uv, Python, FFmpeg com os filtros, FFprobe, baixador, montador,
# ouvido de texto, ouvido de som, espaço livre) e depois chama "./estudio conferir-kit".
# Grava instalacao.json quando os obrigatórios estão bons. A última linha é um JSON:
# {"ok":bool,"total":n,"prontos":n,"itens":[{"id","ok","texto","codigo"?,"passo"?}]}
# Uso: bash instalar/verificar.sh
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/instalar.sh" verificar "$@"
