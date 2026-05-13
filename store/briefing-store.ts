import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BriefingData } from '@/types';

interface BriefingState {
  currentBriefing: BriefingData | null;
  lastFetched: Date | null;
  fetchBriefing: () => Promise<void>;
  refreshBriefing: () => Promise<void>;
}

async function loadBriefing(): Promise<BriefingData> {
  const res = await fetch('/api/briefing', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch briefing: ${res.status}`);
  return res.json() as Promise<BriefingData>;
}

export const useBriefingStore = create<BriefingState>()(
  devtools(
    (set) => ({
      currentBriefing: null,
      lastFetched: null,

      fetchBriefing: async () => {
        const briefing = await loadBriefing();
        set({ currentBriefing: briefing, lastFetched: new Date() }, false, 'fetchBriefing');
      },

      refreshBriefing: async () => {
        // Same as fetch; kept distinct so callers can trigger explicit user refreshes
        const briefing = await loadBriefing();
        set({ currentBriefing: briefing, lastFetched: new Date() }, false, 'refreshBriefing');
      },
    }),
    { name: 'briefing-store' }
  )
);
