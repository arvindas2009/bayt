import { NextResponse } from 'next/server';
import { getFamilyWithEverything } from '@/lib/db/queries';

export async function GET() {
  const family = await getFamilyWithEverything();

  if (!family) {
    return NextResponse.json({ error: 'No family found — run npm run seed first' }, { status: 404 });
  }

  return NextResponse.json(family);
}
