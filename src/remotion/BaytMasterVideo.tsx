import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { COLORS } from './theme';
import { Scene1Load } from './scenes/Scene1Load';
import { Scene2Resilience } from './scenes/Scene2Resilience';
import { Scene3Operations } from './scenes/Scene3Operations';
import { Scene4Health } from './scenes/Scene4Health';
import { Scene5Briefing } from './scenes/Scene5Briefing';

/**
 * The 3-minute cut, frame-locked to the script (30 fps, 5,400 frames). Visuals only: the voiceover
 * is mixed in the editor, so there is deliberately no audio here.
 */
export const BaytMasterVideo = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Sequence name="Scene 1 · Load" from={0} durationInFrames={1050} premountFor={fps}>
        <Scene1Load />
      </Sequence>
      <Sequence name="Scene 2 · Resilience" from={1050} durationInFrames={1200} premountFor={fps}>
        <Scene2Resilience />
      </Sequence>
      <Sequence name="Scene 3 · Operations" from={2250} durationInFrames={1350} premountFor={fps}>
        <Scene3Operations />
      </Sequence>
      <Sequence name="Scene 4 · Health" from={3600} durationInFrames={900} premountFor={fps}>
        <Scene4Health />
      </Sequence>
      <Sequence name="Scene 5 · Briefing" from={4500} durationInFrames={900} premountFor={fps}>
        <Scene5Briefing />
      </Sequence>
    </AbsoluteFill>
  );
};
