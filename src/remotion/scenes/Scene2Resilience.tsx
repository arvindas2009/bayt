import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { getSceneTimeline } from '../timeline';

/** Frames 1050-2250 (0:35-1:15). 14-day stress test, handover plan, Salem accepts. */
export const Scene2Resilience = () => (
  <SceneStage
    timeline={getSceneTimeline('scene2')}
    url="https://bayt.internal/load"
    chapter="02"
    title="Stress-test the family. Hand work over with consent."
  >
    <OffthreadVideo src={staticFile('recordings/scene2-resilience.mp4')} style={{ width: 1920, height: 1080 }} />
  </SceneStage>
);
