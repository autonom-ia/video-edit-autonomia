// Roda programas com tempo-limite, captura a saída e tira segredos do texto.
import { spawn } from 'node:child_process';
import { ambienteFilhos } from './ambiente.mjs';

const LIMITE_CAPTURA = 4 * 1024 * 1024;
const CARACTERES_DE_SEGREDO = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

// Sequências de 32+ caracteres [A-Za-z0-9_-] viram <REDACTED>. Laço por caractere, sem regex.
export function sanear(texto) {
  if (!texto) return '';
  let saida = '';
  let trecho = '';
  const fechar = () => {
    saida += trecho.length >= 32 ? '<REDACTED>' : trecho;
    trecho = '';
  };
  for (const ch of String(texto)) {
    if (CARACTERES_DE_SEGREDO.includes(ch)) {
      trecho += ch;
    } else {
      fechar();
      saida += ch;
    }
  }
  fechar();
  return saida;
}

function anexar(atual, pedaco) {
  const novo = atual + pedaco;
  return novo.length > LIMITE_CAPTURA ? novo.slice(novo.length - LIMITE_CAPTURA) : novo;
}

export function rodar(comando, argumentos = [], opcoes = {}) {
  const { cwd, timeoutMs = 10 * 60 * 1000, env, aoReceber } = opcoes;
  return new Promise((resolve) => {
    let saida = '';
    let erro = '';
    let tempoEsgotado = false;
    let filho;
    try {
      filho = spawn(comando, argumentos, {
        cwd,
        env: env || ambienteFilhos(),
        windowsHide: true,
        shell: false,
      });
    } catch (falhou) {
      resolve({ codigo: -1, saida: '', erro: String(falhou && falhou.message), tempoEsgotado: false, naoAchou: true });
      return;
    }
    const relogio = setTimeout(() => {
      tempoEsgotado = true;
      filho.kill('SIGKILL');
    }, timeoutMs);
    filho.stdout.setEncoding('utf8');
    filho.stderr.setEncoding('utf8');
    filho.stdout.on('data', (d) => {
      saida = anexar(saida, d);
      if (aoReceber) aoReceber(d, 'saida');
    });
    filho.stderr.on('data', (d) => {
      erro = anexar(erro, d);
      if (aoReceber) aoReceber(d, 'erro');
    });
    filho.on('error', (falhou) => {
      clearTimeout(relogio);
      resolve({ codigo: -1, saida, erro: erro + String(falhou && falhou.message), tempoEsgotado, naoAchou: falhou && falhou.code === 'ENOENT' });
    });
    filho.on('close', (codigo) => {
      clearTimeout(relogio);
      resolve({ codigo: codigo === null ? -1 : codigo, saida, erro, tempoEsgotado, naoAchou: false });
    });
  });
}

export function ultimasLinhas(texto, n = 12) {
  const linhas = String(texto || '').split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
  return sanear(linhas.slice(-n).join('\n'));
}

export function progresso(mensagem) {
  process.stderr.write(`${mensagem}\n`);
}
