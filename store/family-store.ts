import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Family, FamilyMember, CalendarEvent } from '@/types';

interface FamilyState {
  family: Family | null;
  setFamily: (family: Family) => void;
  getMember: (id: string) => FamilyMember | undefined;
  updateMember: (id: string, partial: Partial<FamilyMember>) => void;
  addMember: (member: FamilyMember) => void;
  addEvent: (memberId: string, event: CalendarEvent) => void;
  removeEvent: (memberId: string, eventId: string) => void;
  resolveConflictByDate: (date: string, memberNames: string[]) => void;
}

export const useFamilyStore = create<FamilyState>()(
  devtools(
    (set, get) => ({
      family: null,

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

      // Mark events as conflict: false for the given member names on a given date
      resolveConflictByDate: (date: string, memberNames: string[]) =>
        set(
          (state) => {
            if (!state.family) return state;
            const targetDate = date.slice(0, 10); // "YYYY-MM-DD"
            const firstNames = new Set(memberNames.map((n) => n.split(' ')[0].toLowerCase()));
            return {
              family: {
                ...state.family,
                members: state.family.members.map((m) => {
                  const firstName = m.name.split(' ')[0].toLowerCase();
                  if (!firstNames.has(firstName)) return m;
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
    { name: 'family-store' }
  )
);
