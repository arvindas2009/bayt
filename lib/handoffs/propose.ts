import type { Family, FamilyMember } from '@/types/family'
import type { HandoffProposal } from '@/types/agents'
import { computeLoad, type LoadItem, type LoadReport } from '@/lib/load/model'
import { BURNOUT_THRESHOLD, WEEKLY_CAPACITY_HOURS } from '@/lib/load/reference-durations'

/**
 * Proposes moving work off an overloaded member. Pure and deterministic.
 *
 * A proposal is only ever a PROPOSAL: it becomes a pending Handoff the recipient must accept,
 * decline or redirect. Bayt never reassigns anyone's time on its own.
 */

/** Aim to bring the sender comfortably under the burnout line, not just one point below it. */
const TARGET_SCORE = BURNOUT_THRESHOLD - 5
const MAX_PROPOSALS = 3
/** Discrete tasks hand over cleanly; huge recurring ones (daily cooking) are a last resort. */
const IDEAL_HOURS = { min: 0.4, max: 3.1 }

const hoursOver = (hours: number) => hours - (TARGET_SCORE / 100) * WEEKLY_CAPACITY_HOURS

function candidateReceivers(item: LoadItem, family: Family, senderId: string, load: LoadReport): FamilyMember[] {
  const byId = (id: string) => family.members.find((m) => m.id === id)
  const lowestLoad = (a: FamilyMember, b: FamilyMember) =>
    (load.members.find((m) => m.memberId === a.id)?.hours ?? 0) - (load.members.find((m) => m.memberId === b.id)?.hours ?? 0)

  const backups = item.backupIds.map(byId).filter((m): m is FamilyMember => Boolean(m) && m!.id !== senderId)
  if (backups.length > 0) return backups.sort(lowestLoad)

  // No named backup: any other adult could take it, and accepting is what creates the backup.
  return family.members.filter((m) => m.role === 'parent' && m.id !== senderId).sort(lowestLoad)
}

export interface ProposeOptions {
  /** Item ids not to propose again (for example, recently declined). */
  exclude?: Set<string>
}

export function proposeHandoffs(family: Family, load: LoadReport, today: Date, options: ProposeOptions = {}): HandoffProposal[] {
  const sender = load.members.find((m) => m.score >= BURNOUT_THRESHOLD && m.memberId === load.topMemberId)
  if (!sender) return []

  const proposals: HandoffProposal[] = []
  // Running hours per member so a proposal never just relocates the overload.
  const projected = new Map(load.members.map((m) => [m.memberId, m.hours]))
  let senderHours = sender.hours

  const owned = load.items
    .filter((i) => i.ownerId === sender.memberId)
    .sort((a, b) => {
      const ideal = (i: LoadItem) => (i.hours >= IDEAL_HOURS.min && i.hours <= IDEAL_HOURS.max ? 0 : 1)
      return ideal(a) - ideal(b) || b.hours - a.hours
    })

  for (const item of owned) {
    if (proposals.length >= MAX_PROPOSALS || hoursOver(senderHours) <= 0) break
    if (item.hours < IDEAL_HOURS.min) continue
    if (options.exclude?.has(item.id)) continue

    const receiver = candidateReceivers(item, family, sender.memberId, load).find((m) => {
      const after = (projected.get(m.id) ?? 0) + item.hours
      // Receiver must stay under the line and remain lighter than the sender.
      return (after / WEEKLY_CAPACITY_HOURS) * 100 < BURNOUT_THRESHOLD && after < senderHours - item.hours
    })
    if (!receiver) continue

    const receiverScore = Math.round(((projected.get(receiver.id) ?? 0) / WEEKLY_CAPACITY_HOURS) * 100)
    const isBackup = item.backupIds.includes(receiver.id)
    const senderName = family.members.find((m) => m.id === sender.memberId)?.name ?? 'The sender'

    proposals.push({
      itemType: item.kind,
      itemId: item.id,
      itemTitle: item.title,
      fromId: sender.memberId,
      toId: receiver.id,
      hours: Math.round(item.hours * 10) / 10,
      reason: isBackup
        ? `${receiver.name} is already a listed backup and carries ${receiverScore}/100 this week. Moving it takes about ${item.hours.toFixed(1)}h off ${senderName}.`
        : `${receiver.name} carries ${receiverScore}/100 this week and has no overlapping commitments. Accepting makes ${receiver.name} a second person who can do it.`,
    })
    projected.set(receiver.id, (projected.get(receiver.id) ?? 0) + item.hours)
    senderHours -= item.hours
  }

  void today
  return proposals
}

/** Re-run the load model as if the proposals were accepted, for the before/after preview. */
export function previewProposals(
  family: Family,
  proposals: HandoffProposal[],
  today: Date,
): LoadReport {
  return computeLoad(family, today, {
    assumeAccepted: proposals.map((p) => ({
      id: `preview:${p.itemId}`,
      familyId: family.id,
      fromId: p.fromId,
      toId: p.toId,
      itemType: p.itemType,
      itemId: p.itemId,
      itemTitle: p.itemTitle,
      reason: p.reason,
      status: 'accepted' as const,
      createdAt: today.toISOString(),
    })),
  })
}
