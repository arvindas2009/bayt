import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AgentName,
  AgentStatus,
  OperationsOutput,
  HealthOutput,
  ConnectionOutput,
  CaregiverOutput,
} from '@/types';
import { mockConnectionOutput } from '@/lib/data/mock-connection';
import { mockCaregiverOutput } from '@/lib/data/mock-caregiver';

type AgentOutputMap = {
  operations?: OperationsOutput;
  health?: HealthOutput;
  connection: ConnectionOutput;
  caregiver: CaregiverOutput;
};

interface AgentState {
  agentStatuses: Record<AgentName, AgentStatus>;
  agentOutputs: AgentOutputMap;
  setStatus: (agent: AgentName, status: AgentStatus) => void;
  setOutput: (agent: AgentName, output: AgentOutputMap[AgentName]) => void;
  runAgent: (agent: AgentName) => Promise<void>;
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
      agentStatuses: {
        operations: 'live',
        health: 'live',
        connection: 'preview',
        caregiver: 'preview',
      },

      agentOutputs: {
        connection: mockConnectionOutput,
        caregiver: mockCaregiverOutput,
      },

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

      runAgent: async (agent) => {
        const { setStatus, setOutput } = get();
        setStatus(agent, 'thinking');
        try {
          const res = await fetch(AGENT_ROUTES[agent], { method: 'POST' });
          if (!res.ok) throw new Error(`Agent ${agent} failed: ${res.status}`);
          const output = await res.json() as NonNullable<AgentOutputMap[AgentName]> & { _mock?: boolean };
          setOutput(agent, output);
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
