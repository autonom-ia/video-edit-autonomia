"""Limpeza da voz: tira ruído de fundo (ventilador, ar-condicionado, rua) com o DPDFNet
(Ceva, Apache-2.0), modelo de 48 kHz, rodando no onnxruntime.

Uso:
  python limpar_voz.py --preparar                      # baixa o modelo (10 MB) e confere o sha256
  python limpar_voz.py --entrada bruto.MOV --saida voz-limpa.wav [--limite-db 24]

O limite deixa uma parte do som original (o ambiente) em vez de zerar o silêncio, que soaria
como vácuo. A saída tem o mesmo tamanho e o mesmo tempo da entrada: os cortes do kit valem igual.
A entrada é o som do bruto já extraído pelo ffmpeg (bruto/som.wav), no relógio do arquivo.
Só usa numpy, onnxruntime e o PyAV que já estão no ambiente da transcrição.
"""

import argparse
import hashlib
import json
import sys
import wave
from pathlib import Path

import numpy as np

REPO = "Ceva-IP/DPDFNet"
ARQUIVO = "onnx/dpdfnet2_48khz_hr.onnx"
REVISAO = "dd6818d00f50c836fed43a6243ebe49116de5964"
SHA256 = "7f0575a5cec0ba4ffd8f8bd657e06d007e4ccdd955d76faab922b9d3291dc14b"
TAXA = 48000
JANELA = 960  # 20 ms a 48 kHz (o modelo recebe 481 faixas de frequência)
PASSO = JANELA // 2
ATRASO_QUADROS = 4  # a saída do modelo vem ~4 passos atrasada em relação à entrada
BLOCO_QUADROS = 2048  # STFT e inversa em blocos (medido: bruto de 5 min, pico de 574 MB e 34 s no M4)


class ModeloNaoConfere(RuntimeError):
    pass


def baixar(so_local: bool, de_novo: bool = False) -> Path:
    from huggingface_hub import hf_hub_download

    caminho = Path(hf_hub_download(REPO, ARQUIVO, revision=REVISAO, local_files_only=so_local, force_download=de_novo))
    if hashlib.sha256(caminho.read_bytes()).hexdigest() != SHA256:
        raise ModeloNaoConfere("o modelo de limpeza de voz não confere (sha256)")
    return caminho


def caminho_do_modelo() -> Path:
    """Modelo do cache; sem ele (instalação antiga), baixa; corrompido, baixa de novo."""
    from huggingface_hub.errors import LocalEntryNotFoundError

    try:
        return baixar(so_local=True)
    except LocalEntryNotFoundError:
        print("modelo de limpeza fora do cache: baixando", file=sys.stderr)
        return baixar(so_local=False)
    except ModeloNaoConfere:
        print("modelo de limpeza corrompido no cache: baixando de novo", file=sys.stderr)
        return baixar(so_local=False, de_novo=True)


def janela_vorbis(n: int) -> np.ndarray:
    i = np.arange(n)
    s = np.sin(0.5 * np.pi * (i + 0.5) / (n / 2))
    return np.sin(0.5 * np.pi * s * s).astype(np.float32)


def espectro(x: np.ndarray, janela: np.ndarray) -> np.ndarray:
    """STFT centrada (borda refletida), como a do librosa: (quadros, faixas) complexo."""
    x = np.pad(x, JANELA // 2, mode="reflect")
    quadros = 1 + (len(x) - JANELA) // PASSO
    saida = np.empty((quadros, JANELA // 2 + 1), dtype=np.complex64)
    base = np.arange(JANELA)[None, :]
    for de in range(0, quadros, BLOCO_QUADROS):
        ate = min(quadros, de + BLOCO_QUADROS)
        idx = base + PASSO * np.arange(de, ate)[:, None]
        saida[de:ate] = np.fft.rfft(x[idx] * janela, axis=1)
    return saida


def onda(spec: np.ndarray, janela: np.ndarray) -> np.ndarray:
    """STFT inversa por soma de janelas sobrepostas, em blocos, com a borda centrada tirada."""
    total = JANELA + PASSO * (len(spec) - 1)
    saida = np.zeros(total, dtype=np.float32)
    peso = np.zeros(total, dtype=np.float32)
    quadrado = janela**2
    for de in range(0, len(spec), BLOCO_QUADROS):
        bloco = (np.fft.irfft(spec[de : de + BLOCO_QUADROS], n=JANELA, axis=1) * janela).astype(np.float32)
        for k, quadro in enumerate(bloco):
            pos = (de + k) * PASSO
            saida[pos : pos + JANELA] += quadro
            peso[pos : pos + JANELA] += quadrado
    saida /= np.where(peso > 1e-8, peso, 1.0)
    return saida[JANELA // 2 : total - JANELA // 2]


def sessao_e_estado(modelo: Path):
    import onnxruntime as ort

    opcoes = ort.SessionOptions()
    opcoes.intra_op_num_threads = 1
    opcoes.inter_op_num_threads = 1
    sessao = ort.InferenceSession(str(modelo), sess_options=opcoes, providers=["CPUExecutionProvider"])
    meta = sessao.get_modelmeta().custom_metadata_map
    estado = np.zeros(int(meta["state_size"]), dtype=np.float32)
    n_erb, n_spec = int(meta["erb_norm_state_size"]), int(meta["spec_norm_state_size"])
    estado[:n_erb] = [float(v) for v in meta["erb_norm_init"].split(",")]
    estado[n_erb : n_erb + n_spec] = [float(v) for v in meta["spec_norm_init"].split(",")]
    return sessao, estado


def limpar(audio: np.ndarray, modelo: Path, limite_db: float) -> np.ndarray:
    janela = janela_vorbis(JANELA)
    sessao, estado = sessao_e_estado(modelo)
    entrada, saida_estado = (i.name for i in sessao.get_inputs())
    nomes_out = [o.name for o in sessao.get_outputs()]
    # 3 janelas de folga no fim: o modelo atrasa 2 janelas, e sem folga os últimos 20 ms sairiam zerados.
    spec = espectro(np.pad(audio, (0, JANELA * 3)), janela)
    # Limite de atenuação: mistura um pouco do original (alinhado ao atraso do modelo), quadro a
    # quadro, direto no espectro de saída (sem guardar cópias do espectro inteiro).
    alfa = np.float32(10.0 ** (-limite_db / 20.0))
    misturado = np.empty_like(spec)
    for t in range(len(spec)):
        quadro_in = np.stack([spec[t].real, spec[t].imag], axis=-1)[None, None].astype(np.float32)
        quadro, estado = sessao.run(nomes_out, {entrada: quadro_in, saida_estado: estado})
        limpo = quadro[0, 0, :, 0] + 1j * quadro[0, 0, :, 1]
        original = spec[t - ATRASO_QUADROS] if t >= ATRASO_QUADROS else 0
        misturado[t] = alfa * original + (1 - alfa) * limpo
    resultado = onda(misturado, janela)
    # Tira o atraso de 2 janelas do modelo e devolve com o tamanho da entrada.
    resultado = resultado[JANELA * 2 :]
    saida = np.zeros(len(audio), dtype=np.float32)
    n = min(len(audio), len(resultado))
    saida[:n] = resultado[:n]
    return saida


def gravar_wav(caminho: Path, audio: np.ndarray) -> None:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767.0).astype("<i2")
    temporario = caminho.with_suffix(".tmp")
    with wave.open(str(temporario), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAXA)
        w.writeframes(pcm.tobytes())
    temporario.replace(caminho)


def main() -> int:
    p = argparse.ArgumentParser(description="Limpeza da voz com DPDFNet (48 kHz).")
    p.add_argument("--preparar", action="store_true", help="só baixa e confere o modelo")
    p.add_argument("--entrada", type=Path)
    p.add_argument("--saida", type=Path)
    p.add_argument("--limite-db", type=float, default=24.0)
    a = p.parse_args()
    if a.preparar:
        caminho_do_modelo()
        print(json.dumps({"ok": True}))
        return 0
    if not a.entrada or not a.saida:
        p.error("informe --entrada e --saida")
    if not a.entrada.exists():
        print(json.dumps({"ok": False, "erro": "arquivo de entrada não existe"}))
        return 1
    from faster_whisper.audio import decode_audio

    audio = decode_audio(str(a.entrada), sampling_rate=TAXA)
    limpo = limpar(audio, caminho_do_modelo(), a.limite_db)
    a.saida.parent.mkdir(parents=True, exist_ok=True)
    gravar_wav(a.saida, limpo)
    print(json.dumps({"ok": True, "duracao_s": round(len(limpo) / TAXA, 3)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
