import raw from './timeline.json';
import { FPS } from './theme';

/**
 * What scripts/capture-scenes.ts saw while recording: when the cursor moved, where it clicked and
 * where the camera should look. Times are milliseconds on each clip's own clock.
 */
export interface CursorMove { t0: number; t1: number; x0: number; y0: number; x1: number; y1: number }
export interface ClickEvt { t: number; x: number; y: number; label: string }
export interface FocusEvt { t: number; x: number; y: number; scale: number; label: string }
export interface SceneTimeline {
  id: string;
  file: string;
  durationMs: number;
  durationFrames: number;
  cursor: CursorMove[];
  clicks: ClickEvt[];
  focus: FocusEvt[];
  marks: Record<string, number>;
  skipped: string[];
}

const scenes = (raw as unknown as { scenes: SceneTimeline[] }).scenes;

/**
 * Playwright's recorder starts a beat after our clock does, so every recorded event is nudged by
 * this many ms to land on the frame where it is visible in the clip. Calibrated against the clips.
 */
export const SYNC_OFFSET_MS = 200;

export const msToFrame = (ms: number) => Math.round(((ms + SYNC_OFFSET_MS) / 1000) * FPS);

export function getSceneTimeline(id: string): SceneTimeline {
  const found = scenes.find((s) => s.id === id);
  if (!found) throw new Error(`No timeline for ${id}. Run: npx tsx scripts/capture-scenes.ts`);
  return found;
}
