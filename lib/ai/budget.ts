/**
 * Serverless hosts (Netlify) kill a request after a fixed time (60 s for synchronous functions at the
 * time of writing), and our agents can chain several model calls. Without a cap the host returns a
 * 502/504 and the page shows no AI output at all, even though the keys are fine.
 *
 * Locally there is no cap. Override with AI_REQUEST_BUDGET_MS (e.g. 22000 if your plan allows 26 s).
 */
const serverless = Boolean(
  process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL,
)

const fromEnv = Number(process.env.AI_REQUEST_BUDGET_MS)

/** Most time one API request may spend on model calls, in total. */
export const REQUEST_BUDGET_MS: number = fromEnv > 0 ? fromEnv : serverless ? 50_000 : Number.POSITIVE_INFINITY

/** Primary gets at most half the budget; the fallback gets at most 40% so both fit in one request. */
export function capTimeouts(timeoutMs: number, fallbackTimeoutMs: number) {
  return {
    primary: Math.min(timeoutMs, REQUEST_BUDGET_MS * 0.5),
    fallback: Math.min(fallbackTimeoutMs, REQUEST_BUDGET_MS * 0.4),
  }
}
