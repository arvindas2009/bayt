import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { getSceneTimeline } from '../timeline';

/** Frames 2250-3600 (1:15-2:00). Inbox, calendar conflicts, Dust Season, the 7-day meal plan. */
export const Scene3Operations = () => (
  <SceneStage
    timeline={getSceneTimeline('scene3')}
    url="https://bayt.internal/operations"
    chapter="03"
    title="Paperwork, clashes and meals, handled"
  >
    <OffthreadVideo src={staticFile('recordings/scene3-operations.mp4')} style={{ width: 1920, height: 1080 }} />
  </SceneStage>
);
