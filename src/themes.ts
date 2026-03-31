export interface Theme {
  canvasBg:  string;
  pageGuide: string;
  stock:     { fill: string; stroke: string; text: string };
  cloud:     { fill: string; stroke: string; text: string };
  aux:       { fill: string; stroke: string; text: string };
  flow: {
    strong:    string;   // pipe / valve / arrow colour
    medium:    string;
    weak:      string;
    valveFill: string;
    label:     string;
  };
  connector: { stroke: string };
  polarity:  { positive: string; negative: string };
  metaBox:   { fill: string; stroke: string; text: string };
}

// ── dark ─────────────────────────────────────────────────────────────────────
// Original muted dark palette (Catppuccin-ish)
const dark: Theme = {
  canvasBg:  '#181825',
  pageGuide: '#44446a',
  stock:     { fill: '#2a2a4a', stroke: '#8888cc', text: '#cdd6f4' },
  cloud:     { fill: '#1e2a1e', stroke: '#66aa66', text: '#a6e3a1' },
  aux:       { fill: '#2a2438', stroke: '#aa88cc', text: '#cba6f7' },
  flow: {
    strong:    '#111111',
    medium:    '#555555',
    weak:      '#999999',
    valveFill: '#1e1e2e',
    label:     '#a6adc8',
  },
  connector: { stroke: '#7c7caa' },
  polarity:  { positive: '#89b4fa', negative: '#cc3333' },
  metaBox:   { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
};

// ── light ─────────────────────────────────────────────────────────────────────
// Clean light theme — ink on paper
const light: Theme = {
  canvasBg:  '#f5f5f0',
  pageGuide: '#aaaacc',
  stock:     { fill: '#e8e8f8', stroke: '#4444aa', text: '#1a1a3a' },
  cloud:     { fill: '#e8f4e8', stroke: '#2a7a2a', text: '#1a3a1a' },
  aux:       { fill: '#f4eef8', stroke: '#7744aa', text: '#3a1a5a' },
  flow: {
    strong:    '#111111',
    medium:    '#444444',
    weak:      '#999999',
    valveFill: '#f5f5f0',
    label:     '#444466',
  },
  connector: { stroke: '#5566aa' },
  polarity:  { positive: '#2244cc', negative: '#cc0000' },
  metaBox:   { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
};

// ── tokyo ─────────────────────────────────────────────────────────────────────
// Tokyo Night — dark background, vivid saturated accents
const tokyo: Theme = {
  canvasBg:  '#1a1b26',
  pageGuide: '#414868',
  stock:     { fill: '#1f2335', stroke: '#7aa2f7', text: '#c0caf5' },
  cloud:     { fill: '#1a2a1e', stroke: '#9ece6a', text: '#9ece6a' },
  aux:       { fill: '#1f1a2e', stroke: '#bb9af7', text: '#bb9af7' },
  flow: {
    strong:    '#c0caf5',
    medium:    '#7aa2f7',
    weak:      '#565f89',
    valveFill: '#1a1b26',
    label:     '#a9b1d6',
  },
  connector: { stroke: '#7dcfff' },
  polarity:  { positive: '#ff9e64', negative: '#ff0040' },
  metaBox:   { fill: '#16161e', stroke: '#414868', text: '#a9b1d6' },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const THEMES: Record<string, Theme> = { dark, light, tokyo };

export const THEME_NAMES = Object.keys(THEMES) as Array<keyof typeof THEMES>;

export function getTheme(name?: string): Theme {
  return (name && THEMES[name]) ? THEMES[name] : THEMES['dark'];
}
