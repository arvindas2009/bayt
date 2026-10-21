import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { getSceneTimeline } from '../timeline';

/** Frames 0-1050 (0:00-0:35). Landing, onboarding, then the load field and Fatima's "Why?". */
export const Scene1Load = () => (
  <SceneStage timeline={getSceneTimeline('scene1')} url="https://bayt.internal/load" chapter="01" title="Where the invisible work lands">
    <OffthreadVideo src={staticFile('recordings/scene1-load.mp4')} style={{ width: 1920, height: 1080 }} />
  </SceneStage>
);
