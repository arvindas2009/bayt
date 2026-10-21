import { Config } from '@remotion/cli/config';

// Remotion bundles src/remotion on its own; Next.js never sees it.
Config.setEntryPoint('./src/remotion/index.ts');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// Bayt's own dev server owns :3000. If Remotion reuses that port it serves a Next.js 404 page and the
// render fails with "not a valid Remotion project", so pin Remotion's ports elsewhere.
Config.setPort(3301);
Config.setStudioPort(3200);
