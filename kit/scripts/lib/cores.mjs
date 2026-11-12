// Cores: leitura de hex, rgb(), hsl() e oklch() sem regex, e conversão para #rrggbb.
const HEX = '0123456789abcdef';

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const doisHex = (n) => {
  const v = limitar(Math.round(n), 0, 255);
  return HEX[Math.floor(v / 16)] + HEX[v % 16];
};

export function rgbParaHex(r, g, b) {
  return `#${doisHex(r)}${doisHex(g)}${doisHex(b)}`;
}

export function hexParaRgb(hex) {
  const h = normalizarHex(hex);
  if (!h) return null;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function normalizarHex(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (!t.startsWith('#')) return null;
  const corpo = t.slice(1);
  for (const ch of corpo) if (!HEX.includes(ch)) return null;
  if (corpo.length === 3 || corpo.length === 4) return `#${corpo[0]}${corpo[0]}${corpo[1]}${corpo[1]}${corpo[2]}${corpo[2]}`;
  if (corpo.length === 6 || corpo.length === 8) return `#${corpo.slice(0, 6)}`;
  return null;
}

function numero(texto, escala100 = 255) {
  const t = texto.trim();
  if (t.endsWith('%')) return (parseFloat(t) / 100) * escala100;
  if (t.endsWith('deg')) return parseFloat(t);
  return parseFloat(t);
}

function separarArgs(dentro) {
  const semBarra = dentro.split('/')[0];
  const trocado = semBarra.split(',').join(' ');
  return trocado.split(' ').map((p) => p.trim()).filter(Boolean);
}

function hslParaRgb(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = limitar(s, 0, 1);
  const ll = limitar(l, 0, 1);
  if (ss === 0) return [ll * 255, ll * 255, ll * 255];
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const canal = (t0) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canal(hh + 1 / 3) * 255, canal(hh) * 255, canal(hh - 1 / 3) * 255];
}

function oklchParaRgb(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const v = limitar(c, 0, 1);
    return (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255;
  });
}

// Converte uma expressão de cor CSS (sem a parte de fora) para hex, ou null.
export function corParaHex(funcao, dentro) {
  const args = separarArgs(dentro);
  if (args.length < 3) return null;
  if (funcao === 'rgb' || funcao === 'rgba') return rgbParaHex(numero(args[0]), numero(args[1]), numero(args[2]));
  if (funcao === 'hsl' || funcao === 'hsla') {
    const rgb = hslParaRgb(numero(args[0]), numero(args[1], 1), numero(args[2], 1));
    return rgbParaHex(...rgb);
  }
  if (funcao === 'oklch') {
    let L = numero(args[0], 1);
    if (!args[0].endsWith('%') && L > 1) L /= 100;
    const rgb = oklchParaRgb(L, numero(args[1], 0.4), numero(args[2]));
    return rgbParaHex(...rgb);
  }
  return null;
}

const HEX_FULL = '0123456789abcdefABCDEF';

// Acha todas as cores escritas num texto (CSS, HTML, JS) e devolve em #rrggbb.
export function coresNoTexto(texto) {
  const achadas = new Set();
  const t = String(texto);
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '#') {
      let j = i + 1;
      while (j < t.length && HEX_FULL.includes(t[j]) && j - i <= 8) j += 1;
      const tam = j - i - 1;
      const depois = t[j] || '';
      const fimLimpo = !HEX_FULL.includes(depois) && !(depois >= 'g' && depois <= 'z') && !(depois >= 'G' && depois <= 'Z');
      if ((tam === 3 || tam === 6 || tam === 8) && fimLimpo) {
        const h = normalizarHex(t.slice(i, j));
        if (h) achadas.add(h);
      }
    }
  }
  const baixo = t.toLowerCase();
  for (const funcao of ['rgba', 'rgb', 'hsla', 'hsl', 'oklch']) {
    let inicio = 0;
    for (;;) {
      const i = baixo.indexOf(`${funcao}(`, inicio);
      if (i === -1) break;
      const antes = i === 0 ? '' : baixo[i - 1];
      const fim = baixo.indexOf(')', i);
      if (fim === -1) break;
      const ehInicioDePalavra = !(antes >= 'a' && antes <= 'z');
      if (ehInicioDePalavra) {
        const hex = corParaHex(funcao, baixo.slice(i + funcao.length + 1, fim));
        if (hex) achadas.add(hex);
      }
      inicio = fim;
    }
  }
  return [...achadas];
}

export function luminancia(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return 0;
  const lin = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function saturacao(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(...rgb) / 255;
  const min = Math.min(...rgb) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

export function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function distancia(a, b) {
  const x = hexParaRgb(a);
  const y = hexParaRgb(b);
  if (!x || !y) return 999;
  return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
}

export function comAlfa(hex, alfa) {
  const rgb = hexParaRgb(hex) || [0, 0, 0];
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alfa})`;
}

// Monta uma paleta de 5 papéis a partir das cores tiradas do logo.
export function paletaDoLogo(cores) {
  const lista = cores.map(normalizarHex).filter(Boolean);
  const porLuz = [...lista].sort((a, b) => luminancia(b) - luminancia(a));
  const clara = porLuz[0];
  const escura = porLuz[porLuz.length - 1];
  const papel = clara && luminancia(clara) > 0.75 ? clara : '#ffffff';
  const tinta = escura && luminancia(escura) < 0.06 ? escura : '#1a1a1a';
  const meio = lista.filter((c) => c !== papel && c !== tinta).sort((a, b) => saturacao(b) - saturacao(a));
  const principal = meio[0] || '#2f5d50';
  const destaque = meio.find((c) => distancia(c, principal) > 90) || '#e9c46a';
  const fundo = luminancia(tinta) < 0.02 ? tinta : '#111111';
  return { papel, tinta, principal, destaque, fundo };
}
