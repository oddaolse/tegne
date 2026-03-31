import type { Platform } from './types';

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
  id:        IDTheme;
}

// ── Integration Diagram theme ─────────────────────────────────────────────────

export interface IDPlatformColors {
  current:        string;
  new:            string;
  changing:       string;
  decommissioned: string;
}

export interface IDTheme {
  canvasBg:             string;
  borderStroke:         string;   // default border colour; overridden per-platform when platformColoredBorder
  platformColoredBorder: boolean; // true = border matches platform colour (neon outline)
  connStroke:           string;
  labelInside:          string;
  labelBelow:           string;
  protocolLabel:        string;
  glow:                 boolean;  // apply SVG glow filter on elements
  platforms:            Record<Platform, IDPlatformColors>;
  metaBox:              { fill: string; stroke: string; text: string };
}

// ── dark ─────────────────────────────────────────────────────────────────────
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
  id: {
    canvasBg:             '#181825',
    borderStroke:         '#313244',
    platformColoredBorder: false,
    connStroke:           '#6c7086',
    labelInside:          '#ffffff',
    labelBelow:           '#a6adc8',
    protocolLabel:        '#585b70',
    glow:                 false,
    platforms: {
      'aws':     { current: '#FF9900', new: '#FFB84D', changing: '#CC7A00', decommissioned: '#585b70' },
      'azure':   { current: '#0078D4', new: '#2B9AF3', changing: '#005EA6', decommissioned: '#585b70' },
      'on-prem': { current: '#6B7C3A', new: '#8A9E4A', changing: '#4E5B2A', decommissioned: '#585b70' },
      'gcp':     { current: '#34A853', new: '#46C166', changing: '#267D3E', decommissioned: '#585b70' },
      'oracle':  { current: '#C74634', new: '#E05A45', changing: '#963428', decommissioned: '#585b70' },
    },
    metaBox: { fill: '#1a1a2e', stroke: '#555577', text: '#a6adc8' },
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
    label:     '#444466',
  },
  connector: { stroke: '#5566aa' },
  polarity:  { positive: '#2244cc', negative: '#cc0000' },
  metaBox:   { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
  id: {
    canvasBg:             '#f5f5f0',
    borderStroke:         '#4c4f69',
    platformColoredBorder: false,
    connStroke:           '#8c8fa1',
    labelInside:          '#ffffff',
    labelBelow:           '#4c4f69',
    protocolLabel:        '#6c6f85',
    glow:                 false,
    platforms: {
      'aws':     { current: '#E68A00', new: '#FF9900', changing: '#B36B00', decommissioned: '#9e9e9e' },
      'azure':   { current: '#0063B1', new: '#0078D4', changing: '#004E8C', decommissioned: '#9e9e9e' },
      'on-prem': { current: '#4A5628', new: '#6B7C3A', changing: '#333D1C', decommissioned: '#9e9e9e' },
      'gcp':     { current: '#1E8E3E', new: '#34A853', changing: '#146B2F', decommissioned: '#9e9e9e' },
      'oracle':  { current: '#A33525', new: '#C74634', changing: '#7A2718', decommissioned: '#9e9e9e' },
    },
    metaBox: { fill: '#ebebf5', stroke: '#aaaacc', text: '#444466' },
  },
};

// ── tokyo ─────────────────────────────────────────────────────────────────────
// Tokyo Night — dark background, vivid saturated accents
// Integration diagrams: full neon, like neon signs in Shibuya
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
  id: {
    canvasBg:             '#0d0d14',
    borderStroke:         '#0d0d14',   // fallback; overridden per-platform when platformColoredBorder
    platformColoredBorder: true,       // neon border = neon glow outline
    connStroke:           '#7c6f9f',
    labelInside:          '#ffffff',
    labelBelow:           '#e2e0ff',
    protocolLabel:        '#9580ff',
    glow:                 true,
    platforms: {
      'aws':     { current: '#FF6600', new: '#FF8C1A', changing: '#803300', decommissioned: '#2a2a3a' },
      'azure':   { current: '#00BFFF', new: '#40CFFF', changing: '#006680', decommissioned: '#2a2a3a' },
      'on-prem': { current: '#ADFF2F', new: '#C8FF5A', changing: '#5C8A00', decommissioned: '#2a2a3a' },
      'gcp':     { current: '#00FF7F', new: '#40FFAA', changing: '#007A3D', decommissioned: '#2a2a3a' },
      'oracle':  { current: '#FF1744', new: '#FF5252', changing: '#800020', decommissioned: '#2a2a3a' },
    },
    metaBox: { fill: '#0a0a10', stroke: '#9580ff', text: '#e2e0ff' },
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const THEMES: Record<string, Theme> = { dark, light, tokyo };

export const THEME_NAMES = Object.keys(THEMES) as Array<keyof typeof THEMES>;

export function getTheme(name?: string): Theme {
  return (name && THEMES[name]) ? THEMES[name] : THEMES['dark'];
}
