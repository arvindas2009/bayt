import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { getSceneTimeline } from '../timeline';

/** Frames 4500-5400 (2:30-3:00). One briefing, three voices, ending on the Time Dividend. */
export const Scene5Briefing = () => (
  <SceneStage
    timeline={getSceneTimeline('scene5')}
    url="https://bayt.internal/briefing"
    chapter="05"
    title="A briefing that speaks to each person"
  >
    <OffthreadVideo src={staticFile('recordings/scene5-briefing.mp4')} style={{ width: 1920, height: 1080 }} />
  </SceneStage>
);
