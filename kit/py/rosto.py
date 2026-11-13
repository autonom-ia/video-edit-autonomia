"""Onde está o rosto no vídeo: detector YuNet (OpenCV Zoo, MIT), rodando no onnxruntime.

Uso:
  python rosto.py --entrada take.mp4 --saida rosto.json [--intervalo 0.5]
                  [--trechos 0.5-5.7,6.1-11.2] [--rotacao 90]

Saída (posições em pixels do vídeo já girado):
  {"modelo": "yunet-2023mar", "largura": 1080, "altura": 1920, "intervalo_s": 0.5,
   "amostras": [{"t": 0.0, "rosto": {"x": 300, "y": 500, "l": 480, "a": 620, "conf": 0.93,
                 "olho_d": [..], "olho_e": [..], "nariz": [..], "boca_d": [..], "boca_e": [..]}},
                {"t": 0.5, "rosto": null}]}

"rosto" é o maior rosto do quadro (quem fala para a câmera), ou null se não achou nenhum.
O modelo (227 KB) vem com o estúdio em kit/py/modelos. Sem rede, sem GPU.
"""

import argparse
import json
import sys
from pathlib import Path

import av
import numpy as np
import onnxruntime as ort

MODELO = Path(__file__).parent / "modelos" / "face_detection_yunet_2023mar.onnx"
LADO = 640  # entrada fixa do modelo
PASSOS = (8, 16, 32)
CONFIANCA_MINIMA = 0.7
SOBREPOSICAO_MAXIMA = 0.3  # NMS: duas caixas que se cobrem mais que isso são o mesmo rosto
PONTOS = ("olho_d", "olho_e", "nariz", "boca_d", "boca_e")


def preparar_quadro(bgr):
    """Quadro já encolhido para caber em 640x640: completa com preto à direita e embaixo."""
    tela = np.zeros((LADO, LADO, 3), dtype=np.float32)
    tela[: bgr.shape[0], : bgr.shape[1]] = bgr
    return tela.transpose(2, 0, 1)[None]


def decodificar(saidas):
    """Caixas, pontos e confiança de cada posição da grade, como o FaceDetectorYN do OpenCV.
    "saidas" vem por nome (cls_8, obj_8, bbox_8, kps_8...), não pela ordem no arquivo."""
    caixas, pontos, notas = [], [], []
    for passo in PASSOS:
        cls, obj, bbox, kps = (saidas[f"{nome}_{passo}"][0] for nome in ("cls", "obj", "bbox", "kps"))
        colunas = LADO // passo
        idx = np.arange(cls.shape[0])
        col, lin = idx % colunas, idx // colunas
        nota = np.sqrt(np.clip(cls[:, 0], 0, 1) * np.clip(obj[:, 0], 0, 1))
        cx, cy = (col + bbox[:, 0]) * passo, (lin + bbox[:, 1]) * passo
        lg, al = np.exp(bbox[:, 2]) * passo, np.exp(bbox[:, 3]) * passo
        caixas.append(np.stack([cx - lg / 2, cy - al / 2, lg, al], axis=1))
        px = (kps[:, 0::2] + col[:, None]) * passo
        py = (kps[:, 1::2] + lin[:, None]) * passo
        pontos.append(np.stack([px, py], axis=2))
        notas.append(nota)
    return np.concatenate(caixas), np.concatenate(pontos), np.concatenate(notas)


def sem_repetidos(caixas, notas):
    """NMS simples: fica a caixa de nota maior entre as que se sobrepõem."""
    ordem = list(np.argsort(-notas))
    ficam = []
    while ordem:
        i = ordem.pop(0)
        ficam.append(i)
        x1, y1, l1, a1 = caixas[i]
        resto = []
        for j in ordem:
            x2, y2, l2, a2 = caixas[j]
            iw = max(0.0, min(x1 + l1, x2 + l2) - max(x1, x2))
            ih = max(0.0, min(y1 + a1, y2 + a2) - max(y1, y2))
            inter = iw * ih
            uniao = l1 * a1 + l2 * a2 - inter
            if uniao <= 0 or inter / uniao <= SOBREPOSICAO_MAXIMA:
                resto.append(j)
        ordem = resto
    return ficam


def maior_rosto(sessao, bgr, escala):
    """O maior rosto do quadro encolhido, com as posições de volta em pixels do vídeo."""
    nomes = [o.name for o in sessao.get_outputs()]
    saidas = dict(zip(nomes, sessao.run(nomes, {"input": preparar_quadro(bgr)})))
    caixas, pontos, notas = decodificar(saidas)
    boas = notas >= CONFIANCA_MINIMA
    if not boas.any():
        return None
    caixas, pontos, notas = caixas[boas], pontos[boas], notas[boas]
    ficam = sem_repetidos(caixas, notas)
    i = max(ficam, key=lambda k: caixas[k][2] * caixas[k][3])
    x, y, lg, al = (float(v) / escala for v in caixas[i])
    rosto = {"x": round(x), "y": round(y), "l": round(lg), "a": round(al), "conf": round(float(notas[i]), 3)}
    for nome, (px, py) in zip(PONTOS, pontos[i]):
        rosto[nome] = [round(float(px) / escala), round(float(py) / escala)]
    return rosto


def girar(rgb, rotacao):
    """Gira como o ffprobe manda (matriz de exibição, graus no sentido anti-horário, 0 a 359)."""
    voltas = (rotacao // 90) % 4
    return np.rot90(rgb, voltas) if voltas else rgb


def ler_trechos(texto):
    if not texto:
        return None
    pares = []
    for parte in texto.split(","):
        de, ate = parte.split("-")
        pares.append((float(de), float(ate)))
    return pares


def quer_amostra(t, proxima, trechos):
    if t + 1e-6 < proxima:
        return False
    return trechos is None or any(de <= t <= ate for de, ate in trechos)


def medir(entrada: Path, intervalo: float, trechos, rotacao: int):
    sessao = ort.InferenceSession(str(MODELO), providers=["CPUExecutionProvider"])
    amostras = []
    largura = altura = 0
    with av.open(str(entrada)) as video:
        fluxo = video.streams.video[0]
        fluxo.thread_type = "AUTO"
        proxima = 0.0
        for quadro in video.decode(fluxo):
            if quadro.time is None or not quer_amostra(quadro.time, proxima, trechos):
                continue
            proxima = quadro.time + intervalo
            girado = (quadro.height, quadro.width) if rotacao in (90, 270) else (quadro.width, quadro.height)
            largura, altura = girado
            escala = LADO / max(largura, altura)
            # Encolhe já na decodificação (rápido) e só depois gira.
            lado_a, lado_b = round(quadro.width * escala), round(quadro.height * escala)
            bgr = girar(quadro.to_ndarray(width=lado_a, height=lado_b, format="bgr24"), rotacao)
            rosto = maior_rosto(sessao, bgr.astype(np.float32), escala)
            amostras.append({"t": round(float(quadro.time), 3), "rosto": rosto})
    return {"modelo": "yunet-2023mar", "largura": largura, "altura": altura, "intervalo_s": intervalo, "amostras": amostras}


def main() -> int:
    p = argparse.ArgumentParser(description="Posição do rosto ao longo do vídeo (YuNet).")
    p.add_argument("--entrada", type=Path, required=True)
    p.add_argument("--saida", type=Path, required=True)
    p.add_argument("--intervalo", type=float, default=0.5)
    p.add_argument("--trechos", default="")
    p.add_argument("--rotacao", type=int, default=0)
    a = p.parse_args()
    if not a.entrada.exists():
        print(json.dumps({"ok": False, "erro": "arquivo de entrada não existe"}))
        return 1
    resultado = medir(a.entrada, a.intervalo, ler_trechos(a.trechos), a.rotacao)
    a.saida.parent.mkdir(parents=True, exist_ok=True)
    temporario = a.saida.with_suffix(".tmp")
    temporario.write_text(json.dumps(resultado, ensure_ascii=False) + "\n", encoding="utf-8")
    temporario.replace(a.saida)
    com_rosto = sum(1 for x in resultado["amostras"] if x["rosto"])
    print(json.dumps({"ok": True, "amostras": len(resultado["amostras"]), "com_rosto": com_rosto}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
