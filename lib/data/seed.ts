import { format } from 'date-fns'
import {
  buildCalendarEvents,
  buildMemories,
  buildObligations,
  mockFamily,
  mockHealthProfiles,
  mockMedications,
} from './mock-family'
import { getStartOfToday } from '../time/today'
import { SEED_ANCHOR_KEY } from './seed-constants'

process.env.DATABASE_URL ??= 'file:./dev.db'

const stringify = <T>(value: T) => JSON.stringify(value)

async function main() {
  const { default: prisma } = await import('../db/prisma')
  const today = getStartOfToday()

  const events = buildCalendarEvents(today)
  const obligations = buildObligations(today)
  const memories = buildMemories(today)

  try {
    await prisma.$transaction(async (tx) => {
      // Children before parents.
      await tx.handoff.deleteMany()
      await tx.obligation.deleteMany()
      await tx.memory.deleteMany()
      await tx.agentRun.deleteMany()
      await tx.meal.deleteMany()
      await tx.mealPlan.deleteMany()
      await tx.briefing.deleteMany()
      await tx.calendarEvent.deleteMany()
      await tx.medication.deleteMany()
      await tx.healthProfile.deleteMany()
      await tx.familyMember.deleteMany()
      await tx.family.deleteMany()
      await tx.setting.deleteMany({ where: { key: SEED_ANCHOR_KEY } })

      await tx.family.create({ data: { id: mockFamily.id, name: mockFamily.name } })

      await tx.familyMember.createMany({
        data: mockFamily.members.map((member) => ({
          id: member.id,
          familyId: mockFamily.id,
          name: member.name,
          role: member.role,
          age: member.age,
          avatarSeed: member.avatarSeed,
          dietaryNeeds: stringify(member.dietaryNeeds),
          preferences: member.preferences ? stringify(member.preferences) : null,
        })),
      })

      await tx.healthProfile.createMany({
        data: Object.values(mockHealthProfiles).map((profile) => ({
          memberId: profile.memberId,
          conditions: stringify(profile.conditions),
          lastLabResults: stringify(profile.lastLabResults),
          wearableData: stringify(profile.wearableData),
          riskFlags: stringify(profile.riskFlags),
        })),
      })

      await tx.medication.createMany({
        data: mockMedications.map((medication) => ({
          id: medication.id,
          memberId: medication.memberId,
          name: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          interactions: stringify(medication.interactions),
          ownerId: medication.ownerId ?? medication.memberId,
          backupIds: stringify(medication.backupIds ?? []),
        })),
      })

      await tx.calendarEvent.createMany({
        data: events.map((event) => ({
          id: event.id,
          memberId: event.memberId,
          title: event.title,
          date: new Date(event.date),
          category: event.category.toLowerCase(),
          conflict: event.conflict,
          metadata: event.metadata ? stringify(event.metadata) : null,
          ownerId: event.ownerId ?? null,
          backupIds: stringify(event.backupIds ?? []),
          recurrence: event.recurrence ?? null,
        })),
      })

      await tx.obligation.createMany({
        data: obligations.map((o) => ({
          id: o.id,
          familyId: o.familyId,
          title: o.title,
          category: o.category,
          taskType: o.taskType,
          dueDate: new Date(o.dueDate),
          recurrence: o.recurrence ?? null,
          ownerId: o.ownerId,
          backupIds: stringify(o.backupIds),
          subjectId: o.subjectId ?? null,
          consequence: o.consequence,
          leadTimeDays: o.leadTimeDays,
          status: o.status,
          sourceType: o.sourceType ?? 'seed',
        })),
      })

      await tx.memory.createMany({
        data: memories.map((m) => ({
          id: m.id,
          familyId: mockFamily.id,
          quote: m.quote,
          attribution: m.attribution,
          role: m.role,
          source: 'sample',
          capturedAt: new Date(m.capturedAt),
        })),
      })

      await tx.setting.create({ data: { key: SEED_ANCHOR_KEY, value: format(today, 'yyyy-MM-dd') } })
    })

    const conflictCount = events.filter((event) => event.conflict).length
    console.log(
      `Seeded ${mockFamily.members.length} members, ${mockMedications.length} medications, ${events.length} events ` +
        `(${conflictCount} flagged conflicts), ${obligations.length} obligations, ${memories.length} sample memories ` +
        `anchored to ${format(today, 'yyyy-MM-dd')}`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})
