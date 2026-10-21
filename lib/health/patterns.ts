import type { Family, FamilyMember, LabResult } from '@/types/family'
import type { CrossLink, FamilyPattern, HealthOutput, MemberSummary } from '@/types/agents'

/**
 * Health summaries computed locally from the data, with no model involved.
 *
 * This is both the Privacy Vault's safe path (nothing leaves the machine) and the fallback when a
 * model is unavailable. It only reports what the records literally say: a lab flagged
 * "alert"/"monitor", a risk flag, a test that two or more members are both out of range on.
 */

const nonNormal = (l: LabResult) => l.status !== 'normal'

function memberStatus(m: FamilyMember): MemberSummary['overallStatus'] {
  const labs = m.healthProfile?.lastLabResults ?? []
  if (labs.some((l) => l.status === 'alert')) return 'alert'
  if (labs.some((l) => l.status === 'monitor') || (m.healthProfile?.riskFlags.length ?? 0) > 0) return 'monitor'
  return 'good'
}

function summarise(m: FamilyMember): MemberSummary {
  const profile = m.healthProfile
  const labs = profile?.lastLabResults ?? []
  const labFlags = labs.filter(nonNormal).map((l) => `${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.status})`)
  return {
    memberId: m.id,
    overallStatus: memberStatus(m),
    topFlags: [...labFlags, ...(profile?.riskFlags ?? [])].slice(0, 3),
    keyMetrics: labs.slice(0, 4).map((l) => ({ label: l.test, value: `${l.value}${l.unit ? ` ${l.unit}` : ''}` })),
  }
}

/** Tests where at least two members are out of range: the simplest honest "family pattern". */
function sharedLabPatterns(family: Pick<Family, 'members'>): { patterns: FamilyPattern[]; links: CrossLink[] } {
  const byTest = new Map<string, { member: FamilyMember; lab: LabResult }[]>()
  for (const m of family.members) {
    for (const lab of m.healthProfile?.lastLabResults ?? []) {
      if (!nonNormal(lab)) continue
      byTest.set(lab.test, [...(byTest.get(lab.test) ?? []), { member: m, lab }])
    }
  }

  const patterns: FamilyPattern[] = []
  const links: CrossLink[] = []
  for (const [test, hits] of byTest) {
    if (hits.length < 2) continue
    const id = `shared-${test.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    const worst = hits.some((h) => h.lab.status === 'alert') ? 'warning' : 'info'
    patterns.push({
      id,
      title: `Shared out-of-range result: ${test}`,
      affectedMembers: hits.map((h) => h.member.id),
      severity: worst,
      description: `${hits.map((h) => `${h.member.name} ${h.lab.value}${h.lab.unit ? ` ${h.lab.unit}` : ''}`).join(', ')} are all outside the reference range for ${test}.`,
      recommendation: `Raise ${test} at the next appointment for each person listed, and check whether a household cause (diet, sun exposure) applies to all of them.`,
      confidence: 0.85,
    })
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        links.push({ fromMember: hits[i].member.id, toMember: hits[j].member.id, patternId: id, strength: 0.8 })
      }
    }
  }
  return { patterns, links }
}

export function buildLocalHealthOutput(family: Pick<Family, 'members'>): HealthOutput {
  const { patterns, links } = sharedLabPatterns(family)
  return {
    familyPatterns: patterns,
    memberSummaries: family.members.map(summarise),
    crossLinks: links,
  }
}
