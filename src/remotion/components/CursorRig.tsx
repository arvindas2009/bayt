import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../theme';

/** A glide from (startX, startY) to (targetX, targetY), between two frames. Stage coordinates. */
export interface CursorMoveFrames {
  startFrame: number;
  endFrame: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export interface ClickFrame {
  frame: number;
  x: number;
  y: number;
}

const RIPPLE_FRAMES = 22;
const POINTER_SIZE = 34;
/** Where the arrow's tip sits inside the SVG, so (x, y) is the tip, not the corner. */
const TIP_X = (2.5 / 24) * POINTER_SIZE;
const TIP_Y = (1.5 / 31) * POINTER_SIZE * 1.3;

/**
 * A vector pointer that glides along `moves` on spring physics and leaves an ember ripple at each
 * click. Between moves it rests where the last one ended; before the first it waits at the start.
 */
export const CursorRig = ({
  moves,
  clicks,
  restX,
  restY,
}: {
  moves: CursorMoveFrames[];
  clicks: ClickFrame[];
  restX: number;
  restY: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let x = moves[0]?.startX ?? restX;
  let y = moves[0]?.startY ?? restY;
  for (const m of moves) {
    if (frame < m.startFrame) break;
    const p = spring({
      frame: frame - m.startFrame,
      fps,
      durationInFrames: Math.max(1, m.endFrame - m.startFrame),
      config: { damping: 200, mass: 1, stiffness: 120 },
    });
    x = interpolate(p, [0, 1], [m.startX, m.targetX]);
    y = interpolate(p, [0, 1], [m.startY, m.targetY]);
  }

  // The pointer dips as it presses, then springs back.
  const press = clicks.reduce((acc, c) => {
    const age = frame - c.frame;
    if (age < 0 || age > 12) return acc;
    return Math.min(acc, interpolate(age, [0, 3, 12], [1, 0.82, 1], { extrapolateRight: 'clamp' }));
  }, 1);

  // Hidden until the script first moves it, so a clip that starts mid-page has no stray pointer.
  const appear = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <>
      {clicks.map((c) => {
        const age = frame - c.frame;
        if (age < 0 || age > RIPPLE_FRAMES) return null;
        const t = age / RIPPLE_FRAMES;
        const size = interpolate(t, [0, 1], [18, 112]);
        return (
          <div
            key={`${c.frame}-${c.x}-${c.y}`}
            style={{
              position: 'absolute',
              left: c.x - size / 2,
              top: c.y - size / 2,
              width: size,
              height: size,
              borderRadius: size,
              border: `3px solid ${COLORS.ember}`,
              background: 'rgba(239,68,68,0.18)',
              opacity: interpolate(t, [0, 0.15, 1], [0, 0.95, 0]),
            }}
          />
        );
      })}

      <svg
        width={POINTER_SIZE}
        height={POINTER_SIZE * 1.3}
        viewBox="0 0 24 31"
        style={{
          position: 'absolute',
          left: x - TIP_X,
          top: y - TIP_Y,
          opacity: appear,
          scale: String(press),
          transformOrigin: `${TIP_X}px ${TIP_Y}px`,
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))',
        }}
      >
        <path
          d="M2.5 1.5 L2.5 24.5 L8.2 19.3 L12.4 28.6 L16.3 26.9 L12.2 17.8 L20.2 17.4 Z"
          fill={COLORS.bright}
          stroke={COLORS.background}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
