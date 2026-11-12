// Leitura binária dos átomos de topo de um MP4 (faststart = moov antes de mdat).
import fs from 'node:fs';

export function atomosDeTopo(caminho, limite = 64) {
  const fd = fs.openSync(caminho, 'r');
  const tamanhoArquivo = fs.fstatSync(fd).size;
  const atomos = [];
  try {
    let pos = 0;
    const cab = Buffer.alloc(16);
    while (pos + 8 <= tamanhoArquivo && atomos.length < limite) {
      const lidos = fs.readSync(fd, cab, 0, 16, pos);
      if (lidos < 8) break;
      let tamanho = cab.readUInt32BE(0);
      const tipo = cab.toString('latin1', 4, 8);
      if (tamanho === 1) {
        if (lidos < 16) break;
        tamanho = Number(cab.readBigUInt64BE(8));
      } else if (tamanho === 0) {
        tamanho = tamanhoArquivo - pos;
      }
      atomos.push({ tipo, inicio: pos, tamanho });
      if (tamanho < 8) break;
      pos += tamanho;
    }
  } finally {
    fs.closeSync(fd);
  }
  return atomos;
}

export function temFaststart(caminho) {
  const atomos = atomosDeTopo(caminho);
  const moov = atomos.findIndex((a) => a.tipo === 'moov');
  const mdat = atomos.findIndex((a) => a.tipo === 'mdat');
  if (moov === -1) return false;
  if (mdat === -1) return true;
  return moov < mdat;
}
