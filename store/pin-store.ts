import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isPinId, type PinId } from '@/lib/pins/registry';

/** Pins live in this browser, one list per person the app is viewed as (like the Viewing-as choice). */
const ANYONE = '_';

interface PinState {
  byPerson: Record<string, PinId[]>;
  pinsOf: (personId: string | null) => PinId[];
  toggle: (personId: string | null, id: PinId) => boolean;
  move: (personId: string | null, id: PinId, to: number) => void;
}

export function togglePin(list: PinId[], id: PinId): PinId[] {
  return list.includes(id) ? list.filter((p) => p !== id) : [...list, id];
}

export function movePin(list: PinId[], id: PinId, to: number): PinId[] {
  if (!list.includes(id)) return list;
  const rest = list.filter((p) => p !== id);
  const at = Math.min(Math.max(to, 0), rest.length);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      byPerson: {},
      pinsOf: (personId) => (get().byPerson[personId ?? ANYONE] ?? []).filter(isPinId),
      /** Returns true when the feature is now pinned. */
      toggle: (personId, id) => {
        const key = personId ?? ANYONE;
        const next = togglePin(get().byPerson[key] ?? [], id);
        set((s) => ({ byPerson: { ...s.byPerson, [key]: next } }));
        return next.includes(id);
      },
      move: (personId, id, to) => {
        const key = personId ?? ANYONE;
        set((s) => ({ byPerson: { ...s.byPerson, [key]: movePin(s.byPerson[key] ?? [], id, to) } }));
      },
    }),
    { name: 'bayt-pins', partialize: (s) => ({ byPerson: s.byPerson }) },
  ),
);

const noop = () => () => {};

/**
 * The pins of whoever the app is viewed as, re-rendering when they change. Empty during the server
 * render and hydration (the server cannot see this browser's storage), so the markup matches.
 */
export function usePins(personId: string | null): PinId[] {
  const list = usePinStore((s) => s.byPerson[personId ?? ANYONE]);
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? (list ?? []).filter(isPinId) : [];
}
