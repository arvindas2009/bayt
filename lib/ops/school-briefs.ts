import { addDays, differenceInCalendarDays, format } from 'date-fns'
import type { Family, FamilyMember, Obligation } from '@/types/family'
import type { SchoolHealthBrief } from '@/types/agents'
import { GULF_DUST_SEASON } from '@/lib/data/cultural-calendar'
import type { CulturalContext } from '@/lib/utils/cultural-context'

/**
 * School health briefs, written locally from templates.
 *
 * These emails necessarily mention a child's condition, so they are never sent to a third-party
 * model: the parent's own data fills a fixed template on the server. The briefs are triggered by
 * the data (a nut allergy in a child's profile, a stimulant on their medication list, a
 * respiratory condition heading into dust season), not by hard-coded names.
 */

const SCHOOL_PLACEHOLDER = '[School name]'

function daysToSeasonStart(today: Date, season: { start: string }): number {
  const [m, d] = season.start.split('-').map(Number)
  let start = new Date(today.getFullYear(), m - 1, d)
  if (start < today) start = new Date(today.getFullYear() + 1, m - 1, d)
  return differenceInCalendarDays(start, today)
}

function seasonEnd(today: Date, season: { end: string }): Date {
  const [m, d] = season.end.split('-').map(Number)
  let end = new Date(today.getFullYear(), m - 1, d)
  if (end < today) end = new Date(today.getFullYear() + 1, m - 1, d)
  return end
}

const hasCondition = (m: FamilyMember, re: RegExp) => m.healthProfile?.conditions.some((c) => re.test(c)) ?? false

export function buildSchoolHealthBriefs(
  family: Family,
  senderFullName: string,
  today: Date,
  ctx: CulturalContext,
  obligations: Obligation[] = [],
): SchoolHealthBrief[] {
  const briefs: SchoolHealthBrief[] = []
  const children = family.members.filter((m) => m.role === 'child')
  const signOff = `Warm regards,\n${senderFullName}`

  for (const child of children) {
    const full = `${child.name} ${family.name}`

    // ── Severe nut allergy → canteen protocol + EpiPen on file ──────────────────────
    if (hasCondition(child, /nut allergy/i)) {
      const epipen = obligations.find((o) => o.subjectId === child.id && /epipen|epinephrine/i.test(o.title) && o.status === 'open')
      const expiryNote = epipen
        ? ` We are replacing the device that expires on ${format(new Date(epipen.dueDate), 'd MMMM yyyy')} and will hand the new one to the nurse as soon as we have it.`
        : ''
      briefs.push({
        memberId: child.id,
        memberName: child.name,
        schoolName: SCHOOL_PLACEHOLDER,
        condition: 'Severe nut allergy',
        draftSubject: `Nut allergy protocol: ${full}`,
        draftBody: `Dear ${SCHOOL_PLACEHOLDER} Team,

I am writing about ${child.name}, who has a confirmed severe allergy to peanuts and tree nuts with a risk of anaphylaxis. This needs strict handling in the canteen and in any class activity that involves food.

Could you please confirm that ${child.name}'s allergy action plan is current, that the canteen and ${child.name}'s teachers have been told, and that ${child.name}'s adrenaline auto-injector is stored where staff can reach it quickly.${expiryNote}

I am happy to provide updated documentation from ${child.name}'s doctor on request. Thank you for keeping ${child.name} safe.

${signOff}`,
        urgencyLevel: 'urgent',
        triggerReason: epipen
          ? `Allergy protocol must be current; auto-injector replacement due ${format(new Date(epipen.dueDate), 'd MMM')}`
          : 'Allergy protocol must be current and confirmed with canteen staff',
        validUntil: addDays(today, 14).toISOString(),
      })
    }

    // ── ADHD with a morning stimulant → schedule demanding work early ───────────────
    const stimulant = child.medications.find((m) => /methylphenidate|lisdexamfetamine|amphetamine/i.test(m.name))
    if (hasCondition(child, /adhd/i) && stimulant) {
      briefs.push({
        memberId: child.id,
        memberName: child.name,
        schoolName: SCHOOL_PLACEHOLDER,
        condition: 'ADHD',
        draftSubject: `Scheduling suggestion for ${full}`,
        draftBody: `Dear ${SCHOOL_PLACEHOLDER} Team,

I hope you are well. ${child.name} takes ${stimulant.name} ${stimulant.dosage} each morning as part of ${child.name}'s ADHD plan, supervised by their doctor. It works best in the hours after school starts, so ${child.name}'s strongest focus is usually mid-morning.

Where the timetable allows, we would be grateful if demanding work such as maths, reading comprehension and tests could be placed in that morning window. This is a standing recommendation, not a new concern.

Please let me know if a letter from ${child.name}'s paediatrician would help. Thank you for your support.

${signOff}`,
        urgencyLevel: 'routine',
        triggerReason: 'Standing recommendation to fit the medication schedule',
        validUntil: addDays(today, 90).toISOString(),
      })
    }

    // ── Respiratory condition heading into (or in) dust season ──────────────────────
    if (ctx.respiratoryMemberNames.includes(child.name)) {
      const inSeason = ctx.activeSeasons.includes('dust_season')
      const daysTo = daysToSeasonStart(today, GULF_DUST_SEASON)
      if (inSeason || daysTo <= 30) {
        const when = inSeason ? 'Dust season is under way' : `Dust season starts in ${daysTo} days`
        briefs.push({
          memberId: child.id,
          memberName: child.name,
          schoolName: SCHOOL_PLACEHOLDER,
          condition: 'Asthma',
          draftSubject: `Dust-day precautions for ${full}`,
          draftBody: `Dear ${SCHOOL_PLACEHOLDER} Team,

${when}, and ${child.name} has asthma that dust can trigger. On high-dust days could ${child.name} please be allowed to stay indoors for PE and break, and keep a reliever inhaler within reach at all times?

If ${child.name} reports chest tightness or coughing, please let ${child.name} use the inhaler straight away and call me if it does not settle within a few minutes.

Thank you for helping ${child.name} stay comfortable and in class.

${signOff}`,
          urgencyLevel: 'seasonal',
          triggerReason: inSeason ? 'Dust season is active' : `Dust season starts in ${daysTo} days`,
          validUntil: seasonEnd(today, GULF_DUST_SEASON).toISOString(),
        })
      }
    }
  }

  return briefs
}
