import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, INTER, MONO, STAGE, toStage } from '../theme';
import { msToFrame, type SceneTimeline } from '../timeline';
import { CameraZoom, type CameraKey } from './CameraZoom';
import { CursorRig, type ClickFrame, type CursorMoveFrames } from './CursorRig';
import { WindowFrame } from './WindowFrame';

/**
 * Everything a scene shares: the dusk backdrop, the browser window around the clip, the camera that
 * glides between the places the capture looked at, the cursor that follows what it clicked, and a
 * chapter tag. The clip itself is the child.
 */
export const SceneStage = ({
  timeline,
  url,
  chapter,
  title,
  children,
}: {
  timeline: SceneTimeline;
  url: string;
  chapter: string;
  title: string;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const keys: CameraKey[] = timeline.focus.map((f) => {
    const p = toStage(f.x, f.y);
    return { frame: msToFrame(f.t), x: p.x, y: p.y, scale: f.scale };
  });

  const moves: CursorMoveFrames[] = timeline.cursor.map((m) => {
    const a = toStage(m.x0, m.y0);
    const b = toStage(m.x1, m.y1);
    return { startFrame: msToFrame(m.t0), endFrame: msToFrame(m.t1), startX: a.x, startY: a.y, targetX: b.x, targetY: b.y };
  });

  const clicks: ClickFrame[] = timeline.clicks.map((c) => {
    const p = toStage(c.x, c.y);
    return { frame: msToFrame(c.t), x: p.x, y: p.y };
  });

  const rest = moves[0] ? { x: moves[0].startX, y: moves[0].startY } : toStage(1190, 630);

  const fade = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tag = interpolate(frame, [12, 30, 120, 144], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.background, opacity: fade, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(900px 600px at 88% 108%, rgba(239,68,68,0.13), transparent 70%), radial-gradient(800px 520px at 6% -8%, rgba(168,162,158,0.09), transparent 70%)',
        }}
      />
      <CameraZoom keys={keys}>
        <WindowFrame url={url}>{children}</WindowFrame>
        <CursorRig moves={moves} clicks={clicks} restX={rest.x} restY={rest.y} />
      </CameraZoom>

      <div
        style={{
          position: 'absolute',
          left: STAGE.width / 2 - 360,
          width: 720,
          bottom: 9,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: 14,
          opacity: tag,
          translate: `0 ${interpolate(tag, [0, 1], [8, 0])}px`,
          fontFamily: INTER,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 17, color: COLORS.ember }}>{chapter}</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: COLORS.bright, letterSpacing: 0.2 }}>{title}</span>
      </div>
    </AbsoluteFill>
  );
};
