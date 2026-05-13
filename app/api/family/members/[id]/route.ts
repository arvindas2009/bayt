import { NextRequest, NextResponse } from 'next/server'
import { getFamilyMember } from '@/lib/db/queries'
import prisma from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const member = await getFamilyMember(id)

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json(member)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Update basic member fields
  const memberUpdate: Record<string, unknown> = {}
  if (body.name !== undefined) memberUpdate.name = body.name
  if (body.age !== undefined) memberUpdate.age = Number(body.age)
  if (body.role !== undefined) memberUpdate.role = body.role
  if (body.dietaryNeeds !== undefined) memberUpdate.dietaryNeeds = JSON.stringify(body.dietaryNeeds)
  if (body.preferences !== undefined) memberUpdate.preferences = JSON.stringify(body.preferences)

  await prisma.familyMember.update({
    where: { id },
    data: memberUpdate,
  })

  // Upsert health profile if provided
  if (body.healthProfile) {
    const hp = body.healthProfile as Record<string, unknown>
    const existing = await prisma.healthProfile.findUnique({ where: { memberId: id } })
    if (existing) {
      await prisma.healthProfile.update({
        where: { memberId: id },
        data: {
          conditions: hp.conditions !== undefined ? JSON.stringify(hp.conditions) : existing.conditions,
          riskFlags:  hp.riskFlags  !== undefined ? JSON.stringify(hp.riskFlags)  : existing.riskFlags,
        },
      })
    } else {
      await prisma.healthProfile.create({
        data: {
          memberId:       id,
          conditions:     JSON.stringify(hp.conditions ?? []),
          lastLabResults: JSON.stringify([]),
          wearableData:   JSON.stringify({ avgHeartRate: 0, sleepHours: 0, steps: 0, lastSync: new Date().toISOString() }),
          riskFlags:      JSON.stringify(hp.riskFlags ?? []),
        },
      })
    }
  }

  // Replace medications if provided
  if (Array.isArray(body.medications)) {
    await prisma.medication.deleteMany({ where: { memberId: id } })
    const meds = body.medications as Array<{ name: string; dosage: string; frequency: string; interactions?: string[] }>
    for (const med of meds) {
      await prisma.medication.create({
        data: {
          memberId:     id,
          name:         med.name,
          dosage:       med.dosage,
          frequency:    med.frequency,
          interactions: JSON.stringify(med.interactions ?? []),
        },
      })
    }
  }

  const updated = await getFamilyMember(id)
  return NextResponse.json(updated)
}
