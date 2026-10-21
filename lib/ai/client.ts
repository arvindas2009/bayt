import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export const geminiFlash = google('gemini-2.5-flash')
export const geminiPro = google('gemini-2.5-pro')

export const NVIDIA_MODEL_ID = process.env.NVIDIA_MODEL ?? 'nvidia/nemotron-3.5-lightning-30b-a3b'

const nvidia = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY ?? '',
  // The AI SDK drops provider options it does not know, so `chat_template_kwargs` never reached
  // NVIDIA and Nemotron "thought" for thousands of tokens before answering (measured: 4,568 of
  // 6,000 tokens spent reasoning, minutes of latency, JSON cut off mid-string). Inject the switch
  // into the request body ourselves. Only for Nemotron: other models may reject the field.
  fetch: async (input, init) => {
    if (typeof init?.body === 'string' && /nemotron/i.test(NVIDIA_MODEL_ID)) {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>
        body.chat_template_kwargs = {
          ...((body.chat_template_kwargs as Record<string, unknown> | undefined) ?? {}),
          enable_thinking: false,
        }
        return fetch(input, { ...init, body: JSON.stringify(body) })
      } catch {
        // Not JSON: send as is.
      }
    }
    return fetch(input, init)
  },
})

/**
 * Fallback model, via NVIDIA build. Used automatically when Gemini is rate-limited, overloaded or
 * has no valid key. Configurable because NVIDIA retires models: nemotron-3-nano-30b-a3b was removed
 * and returned `410 Gone`, which silently turned every fallback call into sample data, and
 * nemotron-3-super-120b-a12b later returned `404 Function not found for account`. nemotron-3-ultra-550b-a55b worked but often ran past
 * the 40 s fallback budget. Tested with
 * structured (JSON-schema) output.
 * Check https://build.nvidia.com for what is currently served.
 */
// Must use .chat() explicitly: @ai-sdk/openai v3 default callable always routes to the
// OpenAI Responses API (/v1/responses), which NVIDIA doesn't support. .chat() forces
// the OpenAIChatLanguageModel which uses /v1/chat/completions.
export const fallbackModel = nvidia.chat(NVIDIA_MODEL_ID)
