import { mockCalendarEvents, mockFamily, mockHealthProfiles, mockMedications } from './mock-family'

process.env.DATABASE_URL ??= 'file:./dev.db'

const stringify = <T>(value: T) => JSON.stringify(value)

async function main() {
  const { default: prisma } = await import('../db/prisma')

  try {
    await prisma.$transaction(async (tx) => {
      await tx.meal.deleteMany()
      await tx.mealPlan.deleteMany()
      await tx.briefing.deleteMany()
      await tx.calendarEvent.deleteMany()
      await tx.medication.deleteMany()
      await tx.healthProfile.deleteMany()
      await tx.familyMember.deleteMany()
      await tx.family.deleteMany()

      await tx.family.create({
        data: {
          id: mockFamily.id,
          name: mockFamily.name,
        },
      })

      await tx.familyMember.createMany({
        data: mockFamily.members.map((member) => ({
          id: member.id,
          familyId: mockFamily.id,
          name: member.name,
          role: member.role,
          age: member.age,
          avatarSeed: member.avatarSeed,
          dietaryNeeds: stringify(member.dietaryNeeds),
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
        })),
      })

      await tx.calendarEvent.createMany({
        data: mockCalendarEvents.map((event) => ({
          id: event.id,
          memberId: event.memberId,
          title: event.title,
          date: new Date(event.date),
          category: event.category,
          conflict: event.conflict,
          metadata: event.metadata ? stringify(event.metadata) : null,
        })),
      })
    })

    const conflictCount = mockCalendarEvents.filter((event) => event.conflict).length
    console.log(
      `Seeded ${mockFamily.members.length} members, ${mockMedications.length} medications, ${mockCalendarEvents.length} events, ${conflictCount} conflicts`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})