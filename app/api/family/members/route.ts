import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getFamilyMember } from '@/lib/db/queries'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { familyId, name, age, role, dietaryNeeds } = body as {
    familyId: string
    name: string
    age: number
    role: string
    dietaryNeeds?: string[]
  }

  if (!familyId || !name || !age || !role) {
    return NextResponse.json({ error: 'Missing required fields: familyId, name, age, role' }, { status: 400 })
  }

  const member = await prisma.familyMember.create({
    data: {
      familyId,
      name,
      age: Number(age),
      role,
      avatarSeed: name.toLowerCase().replace(/\s+/g, '-'),
      dietaryNeeds: JSON.stringify(dietaryNeeds ?? []),
    },
  })

  const full = await getFamilyMember(member.id)
  return NextResponse.json(full, { status: 201 })
}
