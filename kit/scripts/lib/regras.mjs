// Todas as constantes numéricas do estúdio. Fonte única do kit (spec D.6).
// Os guias do assistente citam os mesmos números. Mudou aqui, mude lá.

export const MASTER = Object.freeze({
  largura: 1080,
  altura: 1920,
  fps: 30,
  codecVideo: 'h264',
  codecAudio: 'aac',
  canais: 2,
  taxaAudio: 48000,
  bitrateAudio: '256k',
  crfTake: 16,
});

export const ZONA_SEGURA = Object.freeze({ topo: 250, base: 1500, esquerda: 60, direita: 230 });

export const RITMO = Object.freeze({
  ganchoMaxS: 3.0,
  golpeAteS: 2.5,
  paradoMaxS: 2.0,
  telaMaxS: 4.0,
  faixaCheiaMaxS: 3.5,
  cardLarguraPct: 90,
  zoomMax: 1.1,
  palavrasPorSegundo: 2.75,
  textoSegundosPorPalavra: 0.3,
  textoMinimoS: 0.8,
  antecipacaoCardS: 4 / 30,
});

export const ZOOM = Object.freeze({
  abertura: { de: 1.26, para: 1.1, duracao: 0.8, ease: 'expo.out' },
  punch: { pico: 1.16, subida: 0.14, assenta: 1.1, volta: 1.0, ease: 'power2.out' },
  lentoAte: 1.1,
});

export const FAIXA = Object.freeze({
  valores: [0, 35, 50, 100],
  alturaPx: { 0: 0, 35: 672, 50: 960, 100: 1920 },
  transicaoS: { 0: 0.45, 35: 0.45, 50: 0.55, 100: 0.55 },
  ease: 'power3.inOut',
  legendaY: { 0: 1600, 35: 700, 50: 988, 100: 1490 },
});

export const LEGENDA = Object.freeze({
  maxPalavras: 3,
  maxCaracteres: 22,
  pausaQuebraS: 0.15,
  pontuacaoQuebra: '.,!?;:',
  antesS: 0.05,
  entradaS: 0.14,
  sobePx: 14,
  desfoquePx: 6,
  depoisS: 0.12,
  fontePx: 56,
  peso: 800,
  enfasePx: 64,
  maxEnfasePorCena: 1,
});

export const SOM = Object.freeze({
  alvoLufs: -14,
  toleranciaLufs: 0.5,
  picoMaxDbtp: -1.0,
  limiter: 0.94,
  vozLufs: -20,
  trilhaAbaixoDaVozDb: 14,
  trilhaAceitaMinDb: 12,
  trilhaAceitaMaxDb: 16,
  ganhoTrilhaMaxDb: 12,
  efeitosAbaixoDaVozLu: [3, 6],
  golpeVolume: 1.4,
  volumeEfeitoNormal: [0.6, 1.0],
  volumeMaxHyperframes: 3.98,
  ducking: { threshold: 0.15, ratio: 2.5, attackMs: 12, releaseMs: 200 },
  celular: { highpassHz: 300, passadas: 2, minimoLufs: -45, quedaMaxLu: 18, calibrado: false },
  silencioBordaMaxS: 0.6,
  lowpassMinimoHz: 900,
});

export const QA = Object.freeze({
  quadroZeroYavgMin: 16,
  congelamentoMaxS: 2,
  duracaoToleranciaPct: 15,
  somNaTrocaS: 0.15,
  silencioDb: -45,
});

export const VIDEO = Object.freeze({
  extensoes: ['.mov', '.mp4', '.m4v'],
  longoMaxS: 600,
  respiroMaxS: 0.4,
});

export const DURACAO_ALVO = Object.freeze({
  medio: { min: 30, max: 45, alvo: 40 },
  curto: { min: 15, max: 30, alvo: 25 },
});

export const ESPACO = Object.freeze({ avisoRenderGb: 4, minimoGb: 2 });

export const MUSICA = Object.freeze({ duracaoMinS: 20, duracaoMaxS: 180, licencas: ['cc0', 'by'] });

export const FALA = Object.freeze({ memoriaMinimaGb: 8, modeloGrande: 'large-v3-turbo', modeloPequeno: 'small' });

// Duração medida (ffprobe) dos 14 sons de kit/sfx.
export const SFX = Object.freeze({
  'impacto-forte': 1.2045,
  'impacto-medio': 0.1745,
  'whoosh-rapido': 0.25,
  'whoosh-medio': 0.5425,
  swish: 0.2005,
  pop: 0.0395,
  zip: 0.349,
  teclado: 0.7295,
  brilho: 1.005,
  'notificacao-saida': 0.283,
  'notificacao-sucesso': 0.53,
  vibrar: 1.1155,
  subida: 2.1945,
  cintilar: 1.109,
});

export const LIMITES_TELA = Object.freeze({
  card: { texto: 6 },
  frase: { texto: 8, apoio: 6 },
  numero: { numero: 4, apoio: 6 },
  lista: { titulo: 10, item: 7, itensMin: 2, itensMax: 4 },
  passos: { item: 7, itensMin: 2, itensMax: 5 },
  conversa: { nome: 3, mensagem: 35, mensagensMin: 1, mensagensMax: 5 },
  prompt: { prompt: 40, resposta: 25 },
  notificacao: { texto: 35, apps: ['Mensagens', 'E-mail', 'Agenda'] },
  cta: { frase: 8 },
});

export const TITULO_GANCHO = Object.freeze({ texto: 10, publico: 12 });

export const POSTAGEM = Object.freeze({ primeiraLinhaMax: 125, hashtagsMax: 5 });

export const ROSTO_NENHUM_MAX_PCT = 30;
