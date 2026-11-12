"""Ouvido de texto do Estúdio de Reels: transcreve a fala em português com o tempo de cada palavra.

Usa faster-whisper (modelo large-v3-turbo, ou small em máquina com pouca memória), na CPU, em int8.
Chamado pelo kit (./estudio transcrever e ./estudio preparar-fala), nunca direto pelo aluno.

Revisão fixa do modelo (Hugging Face), lida do ambiente; o instalador define em instalar/versoes.env:
  FALA_MODELO_REVISAO        revisão do large-v3-turbo
  FALA_MODELO_REVISAO_SMALL  revisão do small
Sem a variável, usa a revisão mais nova (só para desenvolvimento).

Uso:
  python transcrever.py --preparar --modelo large-v3-turbo
  python transcrever.py --entrada voz.wav --saida transcricao.json --modelo large-v3-turbo

Saída (JSON):
  {"idioma": "pt", "modelo": "...", "duracao_s": 41.2,
   "palavras": [{"texto": "Você", "inicio": 0.12, "fim": 0.31, "prob": 0.98}],
   "segmentos": [{"texto": "...", "inicio": 0.12, "fim": 2.9}]}
"""

import argparse
import json
import os
import sys
from pathlib import Path


VARIAVEL_DE_REVISAO = {"large-v3-turbo": "FALA_MODELO_REVISAO", "small": "FALA_MODELO_REVISAO_SMALL"}


def revisao_do_modelo(nome: str):
    valor = os.environ.get(VARIAVEL_DE_REVISAO.get(nome, ""), "").strip()
    return valor or None


def carregar_modelo(nome: str, so_local: bool = False):
    from faster_whisper import WhisperModel

    threads = max(1, min(8, (os.cpu_count() or 4) - 1))
    return WhisperModel(
        nome,
        device="cpu",
        compute_type="int8",
        cpu_threads=threads,
        revision=revisao_do_modelo(nome),
        local_files_only=so_local,
    )


def preparar(nome: str) -> None:
    from faster_whisper import download_model

    revisao = revisao_do_modelo(nome)
    download_model(nome, revision=revisao)
    carregar_modelo(nome)
    print(json.dumps({"ok": True, "modelo": nome, "revisao": revisao or ""}))


def transcrever(entrada: Path, saida: Path, nome: str) -> None:
    # O modelo já foi baixado no preparar-fala: aqui não usa internet.
    modelo = carregar_modelo(nome, so_local=True)
    segmentos, info = modelo.transcribe(
        str(entrada),
        language="pt",
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
        condition_on_previous_text=False,
    )
    palavras = []
    blocos = []
    for seg in segmentos:
        texto_seg = (seg.text or "").strip()
        if texto_seg:
            blocos.append({"texto": texto_seg, "inicio": round(seg.start, 3), "fim": round(seg.end, 3)})
        for w in seg.words or []:
            texto = (w.word or "").strip()
            if not texto:
                continue
            palavras.append(
                {"texto": texto, "inicio": round(w.start, 3), "fim": round(w.end, 3), "prob": round(float(w.probability), 3)}
            )
    resultado = {
        "idioma": "pt",
        "modelo": nome,
        "duracao_s": round(float(info.duration), 3),
        "palavras": palavras,
        "segmentos": blocos,
    }
    saida.parent.mkdir(parents=True, exist_ok=True)
    temporario = saida.with_suffix(".tmp")
    temporario.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporario.replace(saida)
    print(json.dumps({"ok": True, "palavras": len(palavras), "duracao_s": resultado["duracao_s"]}))


def main() -> int:
    p = argparse.ArgumentParser(description="Transcrição em português com tempo por palavra.")
    p.add_argument("--modelo", default="large-v3-turbo", choices=["large-v3-turbo", "small"])
    p.add_argument("--preparar", action="store_true", help="só baixa e testa o modelo")
    p.add_argument("--entrada", type=Path)
    p.add_argument("--saida", type=Path)
    a = p.parse_args()
    if a.preparar:
        preparar(a.modelo)
        return 0
    if not a.entrada or not a.saida:
        p.error("informe --entrada e --saida")
    if not a.entrada.exists():
        print(json.dumps({"ok": False, "erro": "arquivo de entrada não existe"}))
        return 1
    transcrever(a.entrada, a.saida, a.modelo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
