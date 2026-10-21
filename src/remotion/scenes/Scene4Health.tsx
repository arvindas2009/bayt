import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { getSceneTimeline } from '../timeline';

/** Frames 3600-4500 (2:00-2:30). Status words, escorts, lab patterns, the Privacy Vault. */
export const Scene4Health = () => (
  <SceneStage
    timeline={getSceneTimeline('scene4')}
    url="https://bayt.internal/health"
    chapter="04"
    title="Health that stays on this machine"
  >
    <OffthreadVideo src={staticFile('recordings/scene4-health.mp4')} style={{ width: 1920, height: 1080 }} />
  </SceneStage>
);
