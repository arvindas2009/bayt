import type { ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { STAGE } from '../theme';

/** One camera target: look at (x, y) on the stage from `scale`x, arriving at `frame`. */
export interface CameraKey {
  frame: number;
  x: number;
  y: number;
  scale: number;
}

interface State {
  x: number;
  y: number;
  scale: number;
}

const WIDE: State = { x: STAGE.width / 2, y: STAGE.height / 2, scale: 1 };
/** Frames a move takes. Long enough to read as a camera, short enough to keep up with the script. */
const MOVE_FRAMES = 30;

/**
 * Spring-driven pan and zoom. Each key starts a move from wherever the camera is at that moment, so
 * keys that arrive mid-move blend instead of jumping. scale 1 is the whole stage; above 1 the
 * camera is clamped so it never shows past the stage edge.
 */
export const CameraZoom = ({ keys, children }: { keys: CameraKey[]; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stateAt = (index: number, f: number): State => {
    if (index < 0) return WIDE;
    const key = keys[index];
    const from = stateAt(index - 1, key.frame);
    const p = spring({
      frame: f - key.frame,
      fps,
      durationInFrames: MOVE_FRAMES,
      config: { damping: 200, mass: 1, stiffness: 100 },
    });
    return {
      x: interpolate(p, [0, 1], [from.x, key.x]),
      y: interpolate(p, [0, 1], [from.y, key.y]),
      scale: interpolate(p, [0, 1], [from.scale, key.scale]),
    };
  };

  let active = -1;
  for (let i = 0; i < keys.length; i++) if (keys[i].frame <= frame) active = i;
  const s = stateAt(active, frame);

  // Put the focus point at the middle of the screen, then stop the stage sliding off its own edges.
  const tx = Math.min(0, Math.max(STAGE.width - s.scale * STAGE.width, STAGE.width / 2 - s.scale * s.x));
  const ty = Math.min(0, Math.max(STAGE.height - s.scale * STAGE.height, STAGE.height / 2 - s.scale * s.y));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: '0 0',
        translate: `${tx}px ${ty}px`,
        scale: String(s.scale),
      }}
    >
      {children}
    </div>
  );
};
