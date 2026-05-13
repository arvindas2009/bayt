import { NextResponse } from 'next/server';
import { z } from 'zod';
import { safeGenerateObject } from '@/lib/ai/safe-generate';
import { geminiFlash } from '@/lib/ai/client';

const repairStepSchema = z.object({
  day: z.number().describe('The day within the 7-day sequence (e.g., 1, 3, 5, 7)'),
  type: z.enum(['memory_share', 'activity_suggestion', 'conversation_starter', 'scheduled_moment']),
  instruction: z.string().describe('Clear, actionable instruction for this step'),
  estimatedMinutes: z.number().describe('Estimated time commitment in minutes'),
  completed: z.boolean().default(false)
});

const repairProtocolSchema = z.object({
  sequence: z.array(repairStepSchema).length(4).describe('Exactly 4 steps spread across 7 days')
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromMemberId, toMemberId, driftDays, driftCause } = body;

    if (!fromMemberId || !toMemberId || !driftDays || !driftCause) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { ok, data, error } = await safeGenerateObject({
      model: geminiFlash,
      schema: repairProtocolSchema,
      system: `You are the Bayt Connection Agent. Your job is to generate a 7-day connection repair protocol to bridge drift between two family members.
Create a thoughtful, escalating 4-step sequence (typically days 1, 3, 5, 7) that starts small (low effort) and builds up to a scheduled moment.
Output strictly according to the schema.`,
      prompt: `Generate a repair protocol between member ${fromMemberId} and ${toMemberId} who have drifted for ${driftDays} days.
Cause of drift: "${driftCause}"
Make the steps highly specific and actionable.`
    });

    if (!ok) {
      console.error('Agent failure:', error);
      return NextResponse.json({ error: 'Failed to generate protocol' }, { status: 500 });
    }

    const generatedProtocol = {
      id: `rp-${Date.now()}`,
      fromMemberId,
      toMemberId,
      driftDays,
      driftCause,
      status: 'active',
      startedAt: new Date().toISOString(),
      sequence: data.sequence
    };

    return NextResponse.json(generatedProtocol);
  } catch (err: unknown) {
    console.error('Error generating protocol:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
