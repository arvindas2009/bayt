import type { Family } from '@/types';

export async function fetchFamily(): Promise<Family> {
  const res = await fetch('/api/family', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch family: ${res.status}`);
  return res.json() as Promise<Family>;
}
