import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AgentName,
  AgentStatus,
  OperationsOutput,
  HealthOutput,
  ConnectionOutput,
  CaregiverOutput,
  AgentResponseMeta,
} from '@/types';
type AgentOutputMap = {
  operations?: OperationsOutput;
  health?: HealthOutput;
  connection?: ConnectionOutput;
  caregiver?: CaregiverOutput;
};

/** Truthful per-agent metadata: when the result was produced and why it is a fallback, if it is. */
export interface AgentMeta {
  generatedAt?: string;
  error?: string;
}

interface AgentState {
  agentStatuses: Record<AgentName, AgentStatus>;
  agentOutputs: AgentOutputMap;
  agentMeta: Partial<Record<AgentName, AgentMeta>>;
  setStatus: (agent: AgentName, status: AgentStatus) => void;
  setOutput: (agent: AgentName, output: AgentOutputMap[AgentName]) => void;
  /** Without `force` the server returns today's stored run, so opening a page never burns model quota. */
  runAgent: (agent: AgentName, options?: { force?: boolean }) => Promise<void>;
}

const AGENT_ROUTES: Record<AgentName, string> = {
  operations: '/api/agents/operations',
  health: '/api/agents/health',
  connection: '/api/agents/connection',
  caregiver: '/api/agents/caregiver',
};

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      // Nothing is "live" or "preview" until an agent has actually run.
      agentStatuses: {
        operations: 'idle',
        health: 'idle',
        connection: 'idle',
        caregiver: 'idle',
      },

      agentOutputs: {},
      agentMeta: {},

      setStatus: (agent, status) =>
        set(
          (state) => ({
            agentStatuses: { ...state.agentStatuses, [agent]: status },
          }),
          false,
          'setStatus'
        ),

      setOutput: (agent, output) =>
        set(
          (state) => ({
            agentOutputs: { ...state.agentOutputs, [agent]: output },
          }),
          false,
          'setOutput'
        ),

      runAgent: async (agent, options = {}) => {
        const { setStatus, setOutput } = get();
        if (get().agentStatuses[agent] === 'thinking') return;
        setStatus(agent, 'thinking');
        try {
          const res = await fetch(AGENT_ROUTES[agent], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: options.force === true }),
          });
          if (!res.ok) throw new Error(`Agent ${agent} failed: ${res.status}`);
          const output = await res.json() as NonNullable<AgentOutputMap[AgentName]> & AgentResponseMeta;
          setOutput(agent, output);
          set(
            (state) => ({
              agentMeta: { ...state.agentMeta, [agent]: { generatedAt: output._generatedAt, error: output._error } },
            }),
            false,
            'setMeta'
          );
          setStatus(agent, output._mock ? 'preview' : 'live');
        } catch (err) {
          console.error(`runAgent(${agent})`, err);
          setStatus(agent, 'idle');
        }
      },
    }),
    { name: 'agent-store' }
  )
);
