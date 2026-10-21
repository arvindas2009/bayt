import { create } from 'zustand';

/**
 * How many parts of the current page are still loading their first data. The top progress bar
 * (`NavProgress`) only finishes a page switch once this is back to zero, so it never ends while
 * the new page is still a skeleton. Pages hold it through `usePageBusy`.
 */
interface NavProgressState {
  holds: number;
  hold: () => void;
  release: () => void;
}

export const useNavProgressStore = create<NavProgressState>()((set) => ({
  holds: 0,
  hold: () => set((s) => ({ holds: s.holds + 1 })),
  release: () => set((s) => ({ holds: Math.max(0, s.holds - 1) })),
}));
