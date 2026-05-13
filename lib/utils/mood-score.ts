import { faker } from '@faker-js/faker';
import type { MoodScore, MoodScoreInputs } from '@/types/agents';

const STATUS_SCORE: Record<string, number> = { good: 85, monitor: 60, alert: 30 };
const RISK_PENALTY: Record<string, number> = { clear: 0, elevated: 20, high: 50, critical: 80 };

export function calculateMoodScore(inputs: MoodScoreInputs): MoodScore {
  const { healthOutput, caregiverLoad, stressForecast, driftAlerts } = inputs;

  const statusScores = healthOutput.memberSummaries.map(
    (m) => STATUS_SCORE[m.overallStatus] ?? 60
  );
  const health = statusScores.length
    ? Math.round(statusScores.reduce((a, b) => a + b, 0) / statusScores.length)
    : 60;

  const relational = Math.max(0, Math.round(100 - driftAlerts.length * 15));

  const next7 = stressForecast.slice(0, 7);
  const avgRisk = next7.length
    ? next7.reduce((acc, w) => acc + (RISK_PENALTY[w.risk] ?? 0), 0) / next7.length
    : 0;
  const operational = Math.max(0, Math.round(100 - avgRisk));

  const caregiver = Math.max(0, Math.round(100 - caregiverLoad));

  const composite = Math.round(
    health * 0.3 + relational * 0.25 + operational * 0.25 + caregiver * 0.2
  );

  // Seeded random walk ending at composite
  faker.seed(composite * 137 + 42);
  const today = new Date();
  const startScore = Math.min(100, composite + faker.number.int({ min: 5, max: 15 }));

  const historicalScores: { date: string; score: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];

    if (i === 29) {
      historicalScores.push({ date: dateStr, score: composite });
    } else {
      const progress = i / 28;
      const target = startScore + (composite - startScore) * progress;
      const noise = faker.number.float({ min: -3, max: 3 });
      historicalScores.push({
        date: dateStr,
        score: Math.max(0, Math.min(100, Math.round(target + noise))),
      });
    }
  }

  // Trend: compare composite to 7-day prior average
  const prev7 = historicalScores.slice(-8, -1);
  const avg7 = prev7.reduce((a, b) => a + b.score, 0) / prev7.length;
  const diff = composite - avg7;
  const trend: 'rising' | 'stable' | 'falling' =
    diff > 3 ? 'rising' : diff < -3 ? 'falling' : 'stable';

  return {
    composite,
    trend,
    components: { health, relational, operational, caregiver },
    historicalScores,
  };
}
