import { NextResponse } from 'next/server';
import { ensureFreshSeed } from '@/lib/data/refresh';
import { getFamilyWithEverything } from '@/lib/db/queries';

export async function GET() {
  try {
    // Keeps seeded demo dates relative to today before anyone reads them.
    await ensureFreshSeed();
    const family = await getFamilyWithEverything();

    if (!family) {
      return NextResponse.json({ error: 'No family found — run npm run seed first' }, { status: 404 });
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('[GET /api/family]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load family' }, { status: 500 });
  }
}
