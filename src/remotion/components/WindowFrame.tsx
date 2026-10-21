import type { ReactNode } from 'react';
import { COLORS, INTER, MONO, VIEW } from '../theme';

/**
 * Dark browser chrome around a recorded viewport. The child (the video) is laid out at the clip's
 * native 1920x1080 and scaled down, so recorded coordinates map to the stage with `toStage()`.
 */
export const WindowFrame = ({ url, children }: { url: string; children: ReactNode }) => {
  const totalH = VIEW.height + VIEW.chrome;
  return (
    <div
      style={{
        position: 'absolute',
        left: VIEW.x,
        top: VIEW.y,
        width: VIEW.width,
        height: totalH,
        borderRadius: 16,
        overflow: 'hidden',
        background: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 160px rgba(239,68,68,0.07)',
      }}
    >
      <div
        style={{
          height: VIEW.chrome,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 18px',
          background: COLORS.background,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: 9 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: 13, background: c, opacity: 0.9 }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: 640,
            margin: '0 auto',
            height: 30,
            borderRadius: 15,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: INTER,
            fontSize: 14,
            color: COLORS.sand,
            letterSpacing: 0.2,
          }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden>
            <rect x="0.75" y="5.25" width="9.5" height="7" rx="1.5" stroke={COLORS.sand} strokeWidth="1.3" />
            <path d="M2.75 5V3.6a2.75 2.75 0 0 1 5.5 0V5" stroke={COLORS.sand} strokeWidth="1.3" />
          </svg>
          <span style={{ fontFamily: MONO, fontSize: 13 }}>{url}</span>
        </div>
        <div style={{ width: 55 }} />
      </div>

      <div style={{ position: 'relative', width: VIEW.width, height: VIEW.height, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: '0 0',
            scale: String(VIEW.scale),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
