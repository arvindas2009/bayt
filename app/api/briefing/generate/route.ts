import { NextResponse } from 'next/server';
import { getFamilyWithEverything } from '@/lib/db/queries';
import prisma from '@/lib/db/prisma';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { isDemoMode, demoBriefing } from '@/lib/demo/mode';

export async function POST(request: Request) {
  if (isDemoMode) {
    // In demo mode, simulate network delay for effect if desired, but return instantly
    return NextResponse.json({ status: 'generated', briefing: demoBriefing });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const family = await getFamilyWithEverything();
  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  if (!force) {
    const existing = await prisma.briefing.findFirst({
      where: { familyId: family.id },
      orderBy: { date: 'desc' },
    });

    if (existing) {
        const ageHours = (Date.now() - existing.date.getTime()) / (1000 * 60 * 60);
        if (ageHours < 1) {
            return NextResponse.json({ status: 'cached', message: 'Using recent briefing' });
        }
    }
  }

  console.log('[POST /api/briefing/generate] Calling runOrchestrator');
  try {
    const newBriefing = await runOrchestrator(family.id);
    return NextResponse.json({ status: 'generated', briefing: newBriefing });
  } catch (error) {
    console.error('[POST /api/briefing/generate] Orchestrator error:', error);
    return NextResponse.json({ error: 'Orchestrator failed', details: String(error) }, { status: 500 });
  }
}
