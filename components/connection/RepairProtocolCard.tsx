'use client';

import { useState } from 'react';
import { Bookmark, Calendar, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RepairProtocol, RepairStep } from '@/types/agents';
import type { FamilyMember } from '@/types';

interface Props {
  protocol: RepairProtocol;
  members: FamilyMember[];
}

const STEP_ICONS = {
  memory_share: Bookmark,
  activity_suggestion: Calendar,
  conversation_starter: MessageCircle,
  scheduled_moment: Clock,
};

export default function RepairProtocolCard({ protocol, members }: Props) {
  const [localProtocol, setLocalProtocol] = useState<RepairProtocol>(protocol);

  const fromMember = members.find((m) => m.id === protocol.fromMemberId) || { name: 'Unknown' };
  const toMember = members.find((m) => m.id === protocol.toMemberId) || { name: 'Unknown' };

  const handleComplete = (day: number) => {
    setLocalProtocol((prev) => {
      const nextSequence = prev.sequence.map((step) =>
        step.day === day ? { ...step, completed: true } : step
      );
      return { ...prev, sequence: nextSequence };
    });
  };

  const isAllComplete = localProtocol.sequence.every((s) => s.completed);
  
  // Calculate current day based on startedAt, or just use sequence progress for demo:
  const completedCount = localProtocol.sequence.filter(s => s.completed).length;
  // If not all complete, find the day of the next step
  const nextStepDay = localProtocol.sequence.find(s => !s.completed)?.day || 7;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-container)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <div className="flex flex-col gap-2 p-5" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm uppercase tracking-widest text-[var(--on-surface)]">
            Repair Protocol
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] px-2 py-0.5 rounded-full bg-[var(--primary-container)]">
            Day {nextStepDay} of 7
          </span>
        </div>
        <p className="font-mono text-xl text-[var(--on-surface)]">
          {fromMember.name} &amp; {toMember.name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] line-clamp-1">
          {protocol.driftCause}
        </p>
      </div>

      <div className="flex flex-col p-5 relative">
        <AnimatePresence>
          {isAllComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <CheckCircle2 className="size-10 text-emerald-400" />
              <span className="font-mono text-emerald-400 uppercase tracking-widest text-sm">
                Connection Restored
              </span>
            </motion.div>
          ) : (
            <motion.div className="flex flex-col gap-6 relative" exit={{ opacity: 0, height: 0 }}>
              {/* Vertical line connecting steps */}
              <div 
                className="absolute left-[11px] top-4 bottom-4 w-px bg-[var(--surface-container-highest)]" 
                style={{ zIndex: 0 }}
              />

              {localProtocol.sequence.map((step) => {
                const Icon = STEP_ICONS[step.type];
                return (
                  <div key={step.day} className="flex gap-4 relative z-10">
                    <div className="flex flex-col items-center mt-0.5">
                      <div
                        className="size-6 rounded-full flex items-center justify-center font-mono text-[10px]"
                        style={{
                          background: step.completed ? 'var(--primary)' : 'var(--surface-container)',
                          border: `1px solid ${step.completed ? 'var(--primary)' : 'var(--outline-variant)'}`,
                          color: step.completed ? 'var(--on-primary)' : 'var(--on-surface)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {step.completed ? <CheckCircle2 className="size-3.5" /> : step.day}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-[var(--on-surface-variant)]" />
                        <span
                          className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]"
                        >
                          {step.type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--on-surface-variant)] opacity-50 ml-auto">
                          {step.estimatedMinutes}m
                        </span>
                      </div>
                      
                      <p
                        className="text-sm transition-all"
                        style={{
                          color: step.completed ? 'var(--on-surface-variant)' : 'var(--on-surface)',
                          textDecoration: step.completed ? 'line-through' : 'none',
                        }}
                      >
                        {step.instruction}
                      </p>

                      {!step.completed && (
                        <button
                          onClick={() => handleComplete(step.day)}
                          className="mt-2 self-start font-mono text-[10px] uppercase tracking-widest rounded px-3 py-1.5 transition-colors"
                          style={{
                            background: 'var(--surface-container-high)',
                            color: 'var(--on-surface)',
                            border: '1px solid var(--outline-variant)'
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
