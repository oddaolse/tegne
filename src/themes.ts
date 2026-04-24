// ── Colour Palette ────────────────────────────────────────────────────────────

export interface BaseColour {
  current:        string;
  new:            string;
  changing:       string;
  decommissioned: string;
}

export interface ColourPalette {
  green:   BaseColour;
  blue:    BaseColour;
  red:     BaseColour;
  orange:  BaseColour;
  purple:  BaseColour;
  grey:    BaseColour;
  yellow:  BaseColour;
  cyan:    BaseColour;
  pink:    BaseColour;
  teal:    BaseColour;
}

export const VALID_PALETTE_COLOURS = [
  'green', 'blue', 'red', 'orange', 'purple', 'grey', 'yellow', 'cyan', 'pink', 'teal',
] as const;

export type PaletteColourName = typeof VALID_PALETTE_COLOURS[number];

export function getLocationColour(
  palette: ColourPalette,
  colourName: string,
  state: string,
): string {
  const base = palette[colourName as keyof ColourPalette];
  if (!base) return palette.grey.current;
  return base[state as keyof BaseColour] ?? base.current;
}

export type StrideCategory = 'S' | 'T' | 'R' | 'I' | 'D' | 'E';

// ── Threat Model theme ────────────────────────────────────────────────────────

export interface TMTheme {
  canvasBg:       string;
  boundaryFill:   string;
  boundaryStroke: string;
  connStroke:     string;
  refFill:        string;
  refStroke:      string;
  refLabelText:   string;
  stride:         Record<StrideCategory, string>;
  metaBox:        { fill: string; stroke: string; text: string };
  palette:        ColourPalette;
}

export interface Theme {
  canvasBg:  string;
  pageGuide: string;
  stock:     { fill: string; stroke: string; text: string };
  cloud:     { fill: string; stroke: string; text: string };
  aux:       { fill: string; stroke: string; text: string };
  flow: {
    strong:    string;
    medium:    string;
    weak:      string;
    valveFill: string;
    label:     string;
  };
  connector: { stroke: string };
  polarity:  { positive: string; negative: string };
  metaBox:   { fill: string; stroke: string; text: string };
  group:     { fill: string; stroke: string; label: string };
  id:        IDTheme;
  iff:       IFFTheme;
  tm:        TMTheme;
}

// ── Information Flow Diagram theme ───────────────────────────────────────────

export interface IFFTheme {
  canvasBg:     string;
  borderStroke: string;
  connStroke:   string;
  labelText:    string;
  glow:         boolean;
  palette:      ColourPalette;
  metaBox:      { fill: string; stroke: string; text: string };
  group:        { fill: string; stroke: string; label: string };
}

// ── Integration Diagram theme ─────────────────────────────────────────────────

export interface IDTheme {
  canvasBg:              string;
  borderStroke:          string;   // default border colour; overridden per-location when platformColoredBorder
  platformColoredBorder: boolean;  // true = border matches location colour (neon outline)
  connStroke:            string;
  labelInside:           string;
  labelBelow:            string;
  protocolLabel:         string;
  glow:                  boolean;  // apply SVG glow filter on elements
  palette:               ColourPalette;
  metaBox:               { fill: string; stroke: string; text: string };
  group:                 { fill: string; stroke: string; label: string };
}

// ── dark ─────────────────────────────────────────────────────────────────────
const dark: Theme = {
  canvasBg:  '#181825',
  pageGuide: '#44446a',
  stock:     { fill: '#2a2a4a', stroke: '#8888cc', text: '#ffffff' },
  cloud:     { fill: '#1e2a1e', stroke: '#66aa66', text: '#ffffff' },
  aux:       { fill: '#2a2438', stroke: '#aa88cc', text: '#ffffff' },
  flow: {
    strong:    '#111111',
    medium:    '#555555',
    weak:      '#999999',
    valveFill: '#1e1e2e',
    label:     '#ffffff',
  },
  connector: { stroke: '#7c7caa' },
  polarity:  { positive: '#89b4fa', negative: '#cc3333' },
  metaBox:   { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
  group:     { fill: '#1e1e2e', stroke: '#44446a', label: '#ffffff' },
  id: {
    canvasBg:             '#181825',
    borderStroke:         '#313244',
    platformColoredBorder: false,
    connStroke:           '#6c7086',
    labelInside:          '#ffffff',
    labelBelow:           '#a6adc8',
    protocolLabel:        '#ffffff',
    glow:                 false,
    palette: {
      green:  { current: '#28B482', new: '#A5E1D2', changing: '#007272', decommissioned: '#585b70' },
      blue:   { current: '#2563EB', new: '#60A5FA', changing: '#1E40AF', decommissioned: '#585b70' },
      red:    { current: '#DC2626', new: '#F87171', changing: '#991B1B', decommissioned: '#585b70' },
      orange: { current: '#EA580C', new: '#FB923C', changing: '#9A3412', decommissioned: '#585b70' },
      purple: { current: '#7C3AED', new: '#A78BFA', changing: '#5B21B6', decommissioned: '#585b70' },
      grey:   { current: '#6B7280', new: '#9CA3AF', changing: '#4B5563', decommissioned: '#585b70' },
      yellow: { current: '#CA8A04', new: '#FACC15', changing: '#854D0E', decommissioned: '#585b70' },
      cyan:   { current: '#0891B2', new: '#22D3EE', changing: '#0E7490', decommissioned: '#585b70' },
      pink:   { current: '#DB2777', new: '#F472B6', changing: '#9D174D', decommissioned: '#585b70' },
      teal:   { current: '#0D9488', new: '#2DD4BF', changing: '#115E59', decommissioned: '#585b70' },
    },
    metaBox: { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
    group:   { fill: '#1e1e2e', stroke: '#44446a', label: '#ffffff' },
  },
  iff: {
    canvasBg:     '#181825',
    borderStroke: '#313244',
    connStroke:   '#6c7086',
    labelText:    '#ffffff',
    glow:         false,
    palette: {
      green:  { current: '#28B482', new: '#A5E1D2', changing: '#007272', decommissioned: '#585b70' },
      blue:   { current: '#2563EB', new: '#60A5FA', changing: '#1E40AF', decommissioned: '#585b70' },
      red:    { current: '#DC2626', new: '#F87171', changing: '#991B1B', decommissioned: '#585b70' },
      orange: { current: '#EA580C', new: '#FB923C', changing: '#9A3412', decommissioned: '#585b70' },
      purple: { current: '#7C3AED', new: '#A78BFA', changing: '#5B21B6', decommissioned: '#585b70' },
      grey:   { current: '#6B7280', new: '#9CA3AF', changing: '#4B5563', decommissioned: '#585b70' },
      yellow: { current: '#CA8A04', new: '#FACC15', changing: '#854D0E', decommissioned: '#585b70' },
      cyan:   { current: '#0891B2', new: '#22D3EE', changing: '#0E7490', decommissioned: '#585b70' },
      pink:   { current: '#DB2777', new: '#F472B6', changing: '#9D174D', decommissioned: '#585b70' },
      teal:   { current: '#0D9488', new: '#2DD4BF', changing: '#115E59', decommissioned: '#585b70' },
    },
    metaBox: { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
    group:   { fill: '#1e1e2e', stroke: '#44446a', label: '#ffffff' },
  },
  tm: {
    canvasBg:       '#181825',
    boundaryFill:   '#1e1e2e',
    boundaryStroke: '#44446a',
    connStroke:     '#6c7086',
    refFill:        '#2a2a3a',
    refStroke:      '#555577',
    refLabelText:   '#cdd6f4',
    stride: { S: '#cc3333', T: '#e06c00', R: '#d4a017', I: '#7c3aed', D: '#0077cc', E: '#2a7a2a' },
    metaBox: { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
    palette: {
      green:  { current: '#28B482', new: '#A5E1D2', changing: '#007272', decommissioned: '#585b70' },
      blue:   { current: '#2563EB', new: '#60A5FA', changing: '#1E40AF', decommissioned: '#585b70' },
      red:    { current: '#DC2626', new: '#F87171', changing: '#991B1B', decommissioned: '#585b70' },
      orange: { current: '#EA580C', new: '#FB923C', changing: '#9A3412', decommissioned: '#585b70' },
      purple: { current: '#7C3AED', new: '#A78BFA', changing: '#5B21B6', decommissioned: '#585b70' },
      grey:   { current: '#6B7280', new: '#9CA3AF', changing: '#4B5563', decommissioned: '#585b70' },
      yellow: { current: '#CA8A04', new: '#FACC15', changing: '#854D0E', decommissioned: '#585b70' },
      cyan:   { current: '#0891B2', new: '#22D3EE', changing: '#0E7490', decommissioned: '#585b70' },
      pink:   { current: '#DB2777', new: '#F472B6', changing: '#9D174D', decommissioned: '#585b70' },
      teal:   { current: '#0D9488', new: '#2DD4BF', changing: '#115E59', decommissioned: '#585b70' },
    },
  },
};

// ── light ─────────────────────────────────────────────────────────────────────
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
    label:     '#111111',
  },
  connector: { stroke: '#5566aa' },
  polarity:  { positive: '#2244cc', negative: '#cc0000' },
  metaBox:   { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
  group:     { fill: '#e8e8f5', stroke: '#9999bb', label: '#111111' },
  id: {
    canvasBg:             '#f5f5f0',
    borderStroke:         '#4c4f69',
    platformColoredBorder: false,
    connStroke:           '#8c8fa1',
    labelInside:          '#111111',
    labelBelow:           '#111111',
    protocolLabel:        '#111111',
    glow:                 false,
    palette: {
      green:  { current: '#0F7A5A', new: '#28B482', changing: '#065240', decommissioned: '#9e9e9e' },
      blue:   { current: '#1D4ED8', new: '#3B82F6', changing: '#1E3A8A', decommissioned: '#9e9e9e' },
      red:    { current: '#B91C1C', new: '#DC2626', changing: '#7F1D1D', decommissioned: '#9e9e9e' },
      orange: { current: '#C2410C', new: '#EA580C', changing: '#7C2D12', decommissioned: '#9e9e9e' },
      purple: { current: '#6D28D9', new: '#7C3AED', changing: '#4C1D95', decommissioned: '#9e9e9e' },
      grey:   { current: '#4B5563', new: '#6B7280', changing: '#374151', decommissioned: '#9e9e9e' },
      yellow: { current: '#A16207', new: '#CA8A04', changing: '#713F12', decommissioned: '#9e9e9e' },
      cyan:   { current: '#0E7490', new: '#0891B2', changing: '#155E75', decommissioned: '#9e9e9e' },
      pink:   { current: '#BE185D', new: '#DB2777', changing: '#831843', decommissioned: '#9e9e9e' },
      teal:   { current: '#0F766E', new: '#0D9488', changing: '#134E4A', decommissioned: '#9e9e9e' },
    },
    metaBox: { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
    group:   { fill: '#e8e8f5', stroke: '#9999bb', label: '#111111' },
  },
  iff: {
    canvasBg:     '#f5f5f0',
    borderStroke: '#4c4f69',
    connStroke:   '#8c8fa1',
    labelText:    '#111111',
    glow:         false,
    palette: {
      green:  { current: '#0F7A5A', new: '#28B482', changing: '#065240', decommissioned: '#9e9e9e' },
      blue:   { current: '#1D4ED8', new: '#3B82F6', changing: '#1E3A8A', decommissioned: '#9e9e9e' },
      red:    { current: '#B91C1C', new: '#DC2626', changing: '#7F1D1D', decommissioned: '#9e9e9e' },
      orange: { current: '#C2410C', new: '#EA580C', changing: '#7C2D12', decommissioned: '#9e9e9e' },
      purple: { current: '#6D28D9', new: '#7C3AED', changing: '#4C1D95', decommissioned: '#9e9e9e' },
      grey:   { current: '#4B5563', new: '#6B7280', changing: '#374151', decommissioned: '#9e9e9e' },
      yellow: { current: '#A16207', new: '#CA8A04', changing: '#713F12', decommissioned: '#9e9e9e' },
      cyan:   { current: '#0E7490', new: '#0891B2', changing: '#155E75', decommissioned: '#9e9e9e' },
      pink:   { current: '#BE185D', new: '#DB2777', changing: '#831843', decommissioned: '#9e9e9e' },
      teal:   { current: '#0F766E', new: '#0D9488', changing: '#134E4A', decommissioned: '#9e9e9e' },
    },
    metaBox: { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
    group:   { fill: '#e8e8f5', stroke: '#9999bb', label: '#111111' },
  },
  tm: {
    canvasBg:       '#f5f5f0',
    boundaryFill:   '#e8e8f5',
    boundaryStroke: '#9999bb',
    connStroke:     '#8c8fa1',
    refFill:        '#e0e0ee',
    refStroke:      '#6666aa',
    refLabelText:   '#111111',
    stride: { S: '#cc0000', T: '#e06c00', R: '#b8860b', I: '#6d28d9', D: '#0063b1', E: '#1a6b1a' },
    metaBox: { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
    palette: {
      green:  { current: '#0F7A5A', new: '#28B482', changing: '#065240', decommissioned: '#9e9e9e' },
      blue:   { current: '#1D4ED8', new: '#3B82F6', changing: '#1E3A8A', decommissioned: '#9e9e9e' },
      red:    { current: '#B91C1C', new: '#DC2626', changing: '#7F1D1D', decommissioned: '#9e9e9e' },
      orange: { current: '#C2410C', new: '#EA580C', changing: '#7C2D12', decommissioned: '#9e9e9e' },
      purple: { current: '#6D28D9', new: '#7C3AED', changing: '#4C1D95', decommissioned: '#9e9e9e' },
      grey:   { current: '#4B5563', new: '#6B7280', changing: '#374151', decommissioned: '#9e9e9e' },
      yellow: { current: '#A16207', new: '#CA8A04', changing: '#713F12', decommissioned: '#9e9e9e' },
      cyan:   { current: '#0E7490', new: '#0891B2', changing: '#155E75', decommissioned: '#9e9e9e' },
      pink:   { current: '#BE185D', new: '#DB2777', changing: '#831843', decommissioned: '#9e9e9e' },
      teal:   { current: '#0F766E', new: '#0D9488', changing: '#134E4A', decommissioned: '#9e9e9e' },
    },
  },
};

// ── tokyo ─────────────────────────────────────────────────────────────────────
// Tokyo Night — dark background, vivid saturated accents
// Integration diagrams: full neon, like neon signs in Shibuya
const tokyo: Theme = {
  canvasBg:  '#1a1b26',
  pageGuide: '#414868',
  stock:     { fill: '#1f2335', stroke: '#7aa2f7', text: '#ffffff' },
  cloud:     { fill: '#1a2a1e', stroke: '#9ece6a', text: '#ffffff' },
  aux:       { fill: '#1f1a2e', stroke: '#bb9af7', text: '#ffffff' },
  flow: {
    strong:    '#c0caf5',
    medium:    '#7aa2f7',
    weak:      '#565f89',
    valveFill: '#1a1b26',
    label:     '#ffffff',
  },
  connector: { stroke: '#7dcfff' },
  polarity:  { positive: '#ff9e64', negative: '#ff0040' },
  metaBox:   { fill: '#16161e', stroke: '#414868', text: '#a9b1d6' },
  group:     { fill: '#181830', stroke: '#414868', label: '#ffffff' },
  id: {
    canvasBg:             '#0d0d14',
    borderStroke:         '#0d0d14',   // fallback; overridden per-location when platformColoredBorder
    platformColoredBorder: true,       // neon border = neon glow outline
    connStroke:           '#7c6f9f',
    labelInside:          '#ffffff',
    labelBelow:           '#e2e0ff',
    protocolLabel:        '#ffffff',
    glow:                 true,
    palette: {
      green:  { current: '#00FF7F', new: '#40FFAA', changing: '#007A3D', decommissioned: '#2a2a3a' },
      blue:   { current: '#00BFFF', new: '#40CFFF', changing: '#006680', decommissioned: '#2a2a3a' },
      red:    { current: '#FF1744', new: '#FF5252', changing: '#800020', decommissioned: '#2a2a3a' },
      orange: { current: '#FF6600', new: '#FF8C1A', changing: '#803300', decommissioned: '#2a2a3a' },
      purple: { current: '#BF00FF', new: '#D966FF', changing: '#600080', decommissioned: '#2a2a3a' },
      grey:   { current: '#B0C8D8', new: '#C8DDE8', changing: '#6A8899', decommissioned: '#2a2a3a' },
      yellow: { current: '#FFD700', new: '#FFE54D', changing: '#806B00', decommissioned: '#2a2a3a' },
      cyan:   { current: '#00FFFF', new: '#66FFFF', changing: '#008080', decommissioned: '#2a2a3a' },
      pink:   { current: '#FF69B4', new: '#FF99CC', changing: '#993366', decommissioned: '#2a2a3a' },
      teal:   { current: '#40E0D0', new: '#7FFFEE', changing: '#207068', decommissioned: '#2a2a3a' },
    },
    metaBox: { fill: '#0a0a10', stroke: '#9580ff', text: '#e2e0ff' },
    group:   { fill: '#181830', stroke: '#414868', label: '#ffffff' },
  },
  iff: {
    canvasBg:     '#0d0d14',
    borderStroke: '#0d0d14',
    connStroke:   '#7c6f9f',
    labelText:    '#ffffff',
    glow:         true,
    palette: {
      green:  { current: '#00FF7F', new: '#40FFAA', changing: '#007A3D', decommissioned: '#2a2a3a' },
      blue:   { current: '#00BFFF', new: '#40CFFF', changing: '#006680', decommissioned: '#2a2a3a' },
      red:    { current: '#FF1744', new: '#FF5252', changing: '#800020', decommissioned: '#2a2a3a' },
      orange: { current: '#FF6600', new: '#FF8C1A', changing: '#803300', decommissioned: '#2a2a3a' },
      purple: { current: '#BF00FF', new: '#D966FF', changing: '#600080', decommissioned: '#2a2a3a' },
      grey:   { current: '#B0C8D8', new: '#C8DDE8', changing: '#6A8899', decommissioned: '#2a2a3a' },
      yellow: { current: '#FFD700', new: '#FFE54D', changing: '#806B00', decommissioned: '#2a2a3a' },
      cyan:   { current: '#00FFFF', new: '#66FFFF', changing: '#008080', decommissioned: '#2a2a3a' },
      pink:   { current: '#FF69B4', new: '#FF99CC', changing: '#993366', decommissioned: '#2a2a3a' },
      teal:   { current: '#40E0D0', new: '#7FFFEE', changing: '#207068', decommissioned: '#2a2a3a' },
    },
    metaBox: { fill: '#0a0a10', stroke: '#9580ff', text: '#e2e0ff' },
    group:   { fill: '#181830', stroke: '#414868', label: '#ffffff' },
  },
  tm: {
    canvasBg:       '#0d0d14',
    boundaryFill:   '#181830',
    boundaryStroke: '#9580ff',
    connStroke:     '#7c6f9f',
    refFill:        '#1a1a2e',
    refStroke:      '#9580ff',
    refLabelText:   '#e2e0ff',
    stride: { S: '#FF1744', T: '#FF6600', R: '#FFD700', I: '#BF00FF', D: '#00BFFF', E: '#00FF7F' },
    metaBox: { fill: '#0a0a10', stroke: '#9580ff', text: '#e2e0ff' },
    palette: {
      green:  { current: '#00FF7F', new: '#40FFAA', changing: '#007A3D', decommissioned: '#2a2a3a' },
      blue:   { current: '#00BFFF', new: '#40CFFF', changing: '#006680', decommissioned: '#2a2a3a' },
      red:    { current: '#FF1744', new: '#FF5252', changing: '#800020', decommissioned: '#2a2a3a' },
      orange: { current: '#FF6600', new: '#FF8C1A', changing: '#803300', decommissioned: '#2a2a3a' },
      purple: { current: '#BF00FF', new: '#D966FF', changing: '#600080', decommissioned: '#2a2a3a' },
      grey:   { current: '#B0C8D8', new: '#C8DDE8', changing: '#6A8899', decommissioned: '#2a2a3a' },
      yellow: { current: '#FFD700', new: '#FFE54D', changing: '#806B00', decommissioned: '#2a2a3a' },
      cyan:   { current: '#00FFFF', new: '#66FFFF', changing: '#008080', decommissioned: '#2a2a3a' },
      pink:   { current: '#FF69B4', new: '#FF99CC', changing: '#993366', decommissioned: '#2a2a3a' },
      teal:   { current: '#40E0D0', new: '#7FFFEE', changing: '#207068', decommissioned: '#2a2a3a' },
    },
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const THEMES: Record<string, Theme> = { dark, light, tokyo };

export const THEME_NAMES = Object.keys(THEMES) as Array<keyof typeof THEMES>;

export function getTheme(name?: string): Theme {
  return (name && THEMES[name]) ? THEMES[name] : THEMES['dark'];
}
