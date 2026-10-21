import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Family, FamilyMember, CalendarEvent } from '@/types';

interface FamilyState {
  family: Family | null;
  /** Whose point of view the app is shown from. Null = the member carrying the most load. */
  viewingAsId: string | null;
  setViewingAs: (id: string | null) => void;
  setFamily: (family: Family) => void;
  getMember: (id: string) => FamilyMember | undefined;
  updateMember: (id: string, partial: Partial<FamilyMember>) => void;
  addMember: (member: FamilyMember) => void;
  addEvent: (memberId: string, event: CalendarEvent) => void;
  removeEvent: (memberId: string, eventId: string) => void;
  resolveConflictByDate: (date: string, memberIds: string[]) => void;
}

export const useFamilyStore = create<FamilyState>()(
  devtools(
    persist(
    (set, get) => ({
      family: null,
      viewingAsId: null,

      setViewingAs: (id) => set({ viewingAsId: id }, false, 'setViewingAs'),

      setFamily: (family) => set({ family }, false, 'setFamily'),

      getMember: (id) => get().family?.members.find((m) => m.id === id),

      updateMember: (id, partial) =>
        set(
          (state) => ({
            family: state.family
              ? {
                  ...state.family,
                  members: state.family.members.map((m) =>
                    m.id === id ? { ...m, ...partial } : m
                  ),
                }
              : null,
          }),
          false,
          'updateMember'
        ),

      addMember: (member) =>
        set(
          (state) => ({
            family: state.family
              ? { ...state.family, members: [...state.family.members, member] }
              : null,
          }),
          false,
          'addMember'
        ),

      addEvent: (memberId, event) =>
        set(
          (state) => ({
            family: state.family
              ? {
                  ...state.family,
                  members: state.family.members.map((m) =>
                    m.id === memberId
                      ? { ...m, calendarEvents: [...m.calendarEvents, event] }
                      : m
                  ),
                }
              : null,
          }),
          false,
          'addEvent'
        ),

      removeEvent: (memberId, eventId) =>
        set(
          (state) => ({
            family: state.family
              ? {
                  ...state.family,
                  members: state.family.members.map((m) =>
                    m.id === memberId
                      ? { ...m, calendarEvents: m.calendarEvents.filter((e) => e.id !== eventId) }
                      : m
                  ),
                }
              : null,
          }),
          false,
          'removeEvent'
        ),

      // Mark events as conflict: false for the given members on a given date (matched by id, never by name)
      resolveConflictByDate: (date: string, memberIds: string[]) =>
        set(
          (state) => {
            if (!state.family) return state;
            const targetDate = date.slice(0, 10); // "YYYY-MM-DD"
            const ids = new Set(memberIds);
            return {
              family: {
                ...state.family,
                members: state.family.members.map((m) => {
                  if (!ids.has(m.id)) return m;
                  return {
                    ...m,
                    calendarEvents: m.calendarEvents.map((e) =>
                      e.date.slice(0, 10) === targetDate ? { ...e, conflict: false } : e
                    ),
                  };
                }),
              },
            };
          },
          false,
          'resolveConflictByDate'
        ),
    }),
    {
      name: 'bayt-viewing-as',
      // Only the chosen perspective survives a reload; the family itself is always refetched.
      partialize: (state) => ({ viewingAsId: state.viewingAsId }),
    }
    ),
    { name: 'family-store' }
  )
);
