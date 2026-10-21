import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

/** Desert Dusk: the palette from docs/FEATURES.md. */
export const COLORS = {
  background: '#0c0a09',
  surface: '#1c1917',
  border: '#292524',
  ember: '#ef4444',
  sand: '#a8a29e',
  bright: '#f5f5f4',
} as const;

export const { fontFamily: INTER } = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });
export const { fontFamily: MONO } = loadJetBrainsMono('normal', { weights: ['400', '500'], subsets: ['latin'] });

export const FPS = 30;
export const STAGE = { width: 1920, height: 1080 } as const;

/** Where the recorded 1920x1080 viewport sits on the stage. One scale for every scene. */
const VIEW_SCALE = 0.86;
const CHROME_H = 50;
export const VIEW = {
  scale: VIEW_SCALE,
  width: 1920 * VIEW_SCALE,
  height: 1080 * VIEW_SCALE,
  chrome: CHROME_H,
  x: (STAGE.width - 1920 * VIEW_SCALE) / 2,
  y: (STAGE.height - (1080 * VIEW_SCALE + CHROME_H)) / 2 + 6,
} as const;

/** Recorded-viewport pixel -> stage pixel. */
export const toStage = (vx: number, vy: number) => ({
  x: VIEW.x + vx * VIEW.scale,
  y: VIEW.y + VIEW.chrome + vy * VIEW.scale,
});
