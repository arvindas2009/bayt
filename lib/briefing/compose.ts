import { getDayOfYear } from 'date-fns'
import type { Family } from '@/types/family'
import type {
  BriefingAlert,
  BriefingData,
  BriefingInsight,
  CaregiverOutput,
  ConnectionOutput,
  HealthOutput,
  InsightSeverity,
  OperationsOutput,
  TodayPriority,
} from '@/types/agents'
import { invisibleHoursFromLoad } from '@/lib/utils/invisible-hours'
import type { LoadReport } from '@/lib/load/model'
import type { TimeDividendResult } from '@/lib/load/time-dividend'
import type { PriorityItem, PriorityKind } from './rank'

/**
 * Deterministic briefing composition. Everything the briefing says is derived from ranked items
 * and agent output; a model may rephrase it afterwards, but the facts, severities, agents and
 * evidence sources are fixed here.
 */

const SEVERITY_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 }

const AGENT_FOR: Record<PriorityKind, BriefingInsight['agent']> = {
  conflict: 'operations',
  obligation: 'operations',
  handoff: 'caregiver',
  burnout: 'caregiver',
}

export function toTodayPriority(item: PriorityItem): TodayPriority {
  return {
    action: item.action,
    consequence: item.consequence,
    at: item.at,
    severity: item.severity,
    personIds: item.personIds,
    sources: item.sources,
  }
}

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0]?.trim() ?? text

export interface ComposeInput {
  family: Family
  now: Date
  load: LoadReport
  items: PriorityItem[]
  ops: OperationsOutput
  health: HealthOutput
  connection: ConnectionOutput
  caregiver: CaregiverOutput
  dividend: TimeDividendResult
}

export function composeBriefing(input: ComposeInput): BriefingData {
  const { family, now, load, items, health, connection, caregiver, dividend } = input
  const stamp = now.toISOString()
  const nameOf = (id: string) => family.members.find((m) => m.id === id)?.name ?? 'Someone'

  const insights: BriefingInsight[] = items.slice(0, 5).map((item) => ({
    id: `ins_${item.id}`,
    agent: AGENT_FOR[item.kind],
    severity: item.severity,
    text: item.action,
    timestamp: stamp,
    sources: item.sources,
  }))

  const pattern = [...health.familyPatterns].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.confidence - a.confidence,
  )[0]
  if (pattern) {
    insights.push({
      id: `ins_health_${pattern.id}`,
      agent: 'health',
      severity: pattern.severity,
      text: `${pattern.title}. ${pattern.description}`,
      timestamp: stamp,
    })
  }

  const drift = connection.driftAlerts[0]
  if (drift) {
    insights.push({
      id: `ins_connection_${drift.memberAId}_${drift.memberBId}`,
      agent: 'connection',
      severity: 'info',
      text: `${drift.memberA} and ${drift.memberB}: ${drift.reason} ${drift.suggestion}`,
      timestamp: stamp,
      sources: drift.sources,
    })
  }

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const topInsights = insights.slice(0, 6)

  const alerts: BriefingAlert[] = items
    .filter((i) => i.severity !== 'info')
    .slice(0, 4)
    .map((i) => ({
      id: `alert_${i.id}`,
      severity: i.severity,
      text: i.action,
      memberName: nameOf(i.personIds[0]),
      memberId: i.personIds[0],
      agent: AGENT_FOR[i.kind],
      sources: i.sources,
    }))

  const topLoad = caregiver.atRiskMember ?? caregiver.loadDistribution[0]
  const topName = caregiver.atRiskMember?.name ?? caregiver.loadDistribution[0]?.memberName
  const topShare = caregiver.atRiskMember?.shareOfLoad ?? caregiver.loadDistribution[0]?.shareOfLoad
  const lead = items[0] ? firstSentence(items[0].action) : 'Nothing urgent is on the calendar today.'
  const summary = topLoad && topName
    ? `${lead} The family carries ${load.totalHours}h of invisible coordination in the next 7 days, and ${topName} carries ${topShare}% of it.`
    : lead

  const memories = connection.memoriesVault
  const memory = memories.length > 0 ? memories[getDayOfYear(now) % memories.length] : undefined

  return {
    date: stamp,
    summary,
    insights: topInsights,
    timeSavedHours: dividend.hours,
    dailyBreakdown: dividend.dailyBreakdown,
    dividendLines: dividend.lines,
    memoryOfTheDay: memory
      ? { quote: memory.quote, attribution: memory.attribution, dateCaptured: memory.date }
      : undefined,
    alerts,
    invisibleHours: invisibleHoursFromLoad(load),
    priority: items[0] ? toTodayPriority(items[0]) : null,
    source: 'rules',
  }
}
