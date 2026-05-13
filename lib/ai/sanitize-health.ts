import type { HealthOutput } from '@/types/agents'

const LAB_VALUE_RE =
  /\b\d+(\.\d+)?\s*(ng\/mL|mmol\/L|mg\/dL|%|bpm|mmHg|IU\/L|mEq\/L|g\/dL)\b/gi

const MED_RE =
  /\b(metformin|lisinopril|amlodipine|albuterol|methylphenidate|alendronate|ferrous sulfate|calcium|insulin|aspirin|warfarin|vitamin d|epipen)\b/gi

function redact(text: string): string {
  return text.replace(LAB_VALUE_RE, '[value]').replace(MED_RE, '[medication]')
}

export function sanitizeHealthOutput(raw: HealthOutput): HealthOutput {
  return {
    familyPatterns: raw.familyPatterns.map((p) => ({
      ...p,
      description: redact(p.description),
      recommendation: redact(p.recommendation),
    })),
    memberSummaries: raw.memberSummaries.map((s) => ({
      ...s,
      keyMetrics: [],
      topFlags: s.topFlags.map(redact),
    })),
    crossLinks: raw.crossLinks,
  }
}
