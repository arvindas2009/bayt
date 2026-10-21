import { create } from 'zustand';
import type { ChatMode, ChatPage } from '@/lib/chat/answer';
import type { SourceRef } from '@/types/agents';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bayt';
  text: string;
  sources?: SourceRef[];
  page?: ChatPage | null;
  /** How a Bayt answer was made; 'error' when the request itself failed. */
  mode?: ChatMode | 'error';
}

/** Turns sent back to the server as context (the route accepts at most this many). */
const HISTORY_TURNS = 8;

interface ChatState {
  /** One conversation per person the app is viewed as, kept until the page reloads. */
  threads: Record<string, ChatMessage[]>;
  pending: Record<string, boolean>;
  /** Whether the panel is expanded (true) or shrunk to the floating box. */
  open: boolean;
  setOpen: (open: boolean) => void;
  clear: (viewerId: string) => void;
  ask: (viewerId: string, question: string) => Promise<void>;
}

let seq = 0;
const nextId = () => `msg_${Date.now()}_${seq++}`;

export const useChatStore = create<ChatState>()((set, get) => ({
  threads: {},
  pending: {},
  open: false,
  setOpen: (open) => set({ open }),
  clear: (viewerId) => set((s) => ({ threads: { ...s.threads, [viewerId]: [] }, open: false })),
  ask: async (viewerId, question) => {
    const text = question.trim();
    if (!text || get().pending[viewerId]) return;

    const before = get().threads[viewerId] ?? [];
    const history = before
      .filter((m) => m.mode !== 'error')
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), text: m.text }));
    const push = (m: ChatMessage) =>
      set((s) => ({ threads: { ...s.threads, [viewerId]: [...(s.threads[viewerId] ?? []), m] } }));

    push({ id: nextId(), role: 'user', text });
    set((s) => ({ pending: { ...s.pending, [viewerId]: true } }));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, viewerId, history }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.text) throw new Error(body?.error ?? `Chat failed: ${res.status}`);
      push({ id: nextId(), role: 'bayt', text: body.text, sources: body.sources, page: body.page, mode: body.mode });
    } catch (err) {
      console.error('ask bayt:', err);
      push({ id: nextId(), role: 'bayt', text: 'Bayt could not answer just now. Try again in a moment.', mode: 'error' });
    } finally {
      set((s) => ({ pending: { ...s.pending, [viewerId]: false } }));
    }
  },
}));
