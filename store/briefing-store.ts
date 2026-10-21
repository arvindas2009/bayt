import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BriefingData } from '@/types';
import type { MemberBriefing } from '@/types/agents';

/** A personal briefing, kept so returning to the page (or to a person) shows it at once. */
export interface StoredMemberBriefing {
  briefing: MemberBriefing;
  /** False for the deterministic version shown while the model's wording is still on its way. */
  worded: boolean;
}

interface BriefingState {
  currentBriefing: BriefingData | null;
  lastFetched: Date | null;
  memberBriefings: Record<string, StoredMemberBriefing>;
  fetchBriefing: () => Promise<void>;
  refreshBriefing: () => Promise<void>;
  /** A plain version never replaces a worded one that already arrived. */
  setMemberBriefing: (memberId: string, briefing: MemberBriefing, worded: boolean) => void;
}

async function loadBriefing(): Promise<BriefingData> {
  const res = await fetch('/api/briefing', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch briefing: ${res.status}`);
  return res.json() as Promise<BriefingData>;
}

let inflight: Promise<BriefingData> | null = null;

export const useBriefingStore = create<BriefingState>()(
  devtools(
    (set) => ({
      currentBriefing: null,
      lastFetched: null,
      memberBriefings: {},

      fetchBriefing: async () => {
        // Callers that ask at the same moment (the page and useLoadBodies) share one request.
        inflight ??= loadBriefing().finally(() => {
          inflight = null;
        });
        const briefing = await inflight;
        set({ currentBriefing: briefing, lastFetched: new Date() }, false, 'fetchBriefing');
      },

      refreshBriefing: async () => {
        // Always a new request (never shares one in flight), for refreshes right after a change
        const briefing = await loadBriefing();
        set({ currentBriefing: briefing, lastFetched: new Date() }, false, 'refreshBriefing');
      },

      setMemberBriefing: (memberId, briefing, worded) =>
        set(
          (state) => {
            const held = state.memberBriefings[memberId];
            if (!worded && held?.worded && held.briefing.date.slice(0, 10) === briefing.date.slice(0, 10)) return state;
            return { memberBriefings: { ...state.memberBriefings, [memberId]: { briefing, worded } } };
          },
          false,
          'setMemberBriefing'
        ),
    }),
    { name: 'briefing-store' }
  )
);
