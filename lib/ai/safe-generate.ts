import { generateObject, type FlexibleSchema, type InferSchema } from "ai";
import { nemotronNano } from "./client";

export type SafeGenerateResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type OutputFormat = "object" | "array" | "enum" | "no-schema";

type GenerateObjectResultType<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat,
> = OUTPUT extends "array" ? Array<InferSchema<SCHEMA>> : InferSchema<SCHEMA>;

type GenerateObjectOptions<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat,
> = Omit<
  Parameters<typeof generateObject<SCHEMA, OUTPUT>>[0],
  "abortSignal"
> & {
  /** Timeout for the primary model call. Default: 45s */
  timeoutMs?: number;
  /** Timeout for the Nemotron fallback call. Default: 60s */
  fallbackTimeoutMs?: number;
  /** Force JSON generation mode. Required for OpenAI-compatible endpoints (e.g. Nemotron) that don't support tool/function calling. */
  mode?: "auto" | "json" | "tool";
  /** Provider-specific options passed through to generateObject. */
  providerOptions?: Record<string, unknown>;
};

const logTokenUsage = (
  model: string,
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
    reasoningTokens?: number | undefined;
  },
) => {
  console.log(`[AI] generateObject usage (${model})`, {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.reasoningTokens,
  });
};

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Quota exceeded") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("API key is missing")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opts = Parameters<typeof generateObject>[0];

export async function safeGenerateObject<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat = InferSchema<SCHEMA> extends string
    ? "enum"
    : "object",
>(
  options: GenerateObjectOptions<SCHEMA, OUTPUT>,
): Promise<SafeGenerateResult<GenerateObjectResultType<SCHEMA, OUTPUT>>> {
  const {
    timeoutMs = 45_000,
    fallbackTimeoutMs = 60_000,
    ...generateObjectOptions
  } = options;

  const primarySignal = AbortSignal.timeout(timeoutMs);

  try {
    const result = await generateObject({
      ...generateObjectOptions,
      abortSignal: primarySignal,
    } as Opts);
    logTokenUsage("primary", result.usage);
    return {
      ok: true,
      data: result.object as GenerateObjectResultType<SCHEMA, OUTPUT>,
    };
  } catch (primaryError) {
    if (isRateLimitError(primaryError)) {
      console.warn(
        `[AI] Primary model rate-limited — falling back to Nemotron Nano 30B via NVIDIA (budget: ${fallbackTimeoutMs / 1000}s)`,
      );
      const fallbackSignal = AbortSignal.timeout(fallbackTimeoutMs);
      try {
        const result = await generateObject({
          ...generateObjectOptions,
          model: nemotronNano,
          // json mode: uses response_format.type=json_object, more broadly supported
          // than json_schema across OpenAI-compatible endpoints
          mode: "json",
          // Disable thinking/reasoning — these Nemotron models default to a reasoning
          // preamble that can add minutes of latency before the actual JSON output.
          providerOptions: {
            openai: {
              chat_template_kwargs: { enable_thinking: false },
            },
          },
          abortSignal: fallbackSignal,
        } as Opts);
        logTokenUsage("nemotron-nano-30b (fallback)", result.usage);
        return {
          ok: true,
          data: result.object as GenerateObjectResultType<SCHEMA, OUTPUT>,
        };
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        console.error("[AI] Fallback model also failed", fallbackError);
        return { ok: false, error: message };
      }
    }

    const message =
      primaryError instanceof Error
        ? primaryError.message
        : String(primaryError);
    console.error("[AI] generateObject failed", primaryError);
    return { ok: false, error: message };
  }
}
