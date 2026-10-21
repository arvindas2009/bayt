import { Composition, Folder } from 'remotion';
import { BaytMasterVideo } from './BaytMasterVideo';
import { Scene1Load } from './scenes/Scene1Load';
import { Scene2Resilience } from './scenes/Scene2Resilience';
import { Scene3Operations } from './scenes/Scene3Operations';
import { Scene4Health } from './scenes/Scene4Health';
import { Scene5Briefing } from './scenes/Scene5Briefing';

export const RemotionRoot = () => (
  <>
    <Composition
      id="BaytProductDemo"
      component={BaytMasterVideo}
      durationInFrames={5400}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* The same scenes on their own, for previewing one at a time. */}
    <Folder name="Scenes">
      <Composition id="Scene1Load" component={Scene1Load} durationInFrames={1050} fps={30} width={1920} height={1080} />
      <Composition id="Scene2Resilience" component={Scene2Resilience} durationInFrames={1200} fps={30} width={1920} height={1080} />
      <Composition id="Scene3Operations" component={Scene3Operations} durationInFrames={1350} fps={30} width={1920} height={1080} />
      <Composition id="Scene4Health" component={Scene4Health} durationInFrames={900} fps={30} width={1920} height={1080} />
      <Composition id="Scene5Briefing" component={Scene5Briefing} durationInFrames={900} fps={30} width={1920} height={1080} />
    </Folder>
  </>
);
