import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export const geminiFlash = google('gemini-2.5-flash')
export const geminiPro = google('gemini-2.5-pro')

const nvidia = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY ?? '',
})

// Nemotron Nano 30B via NVIDIA build — used as fallback when Gemini hits rate limits.
// Must use .chat() explicitly: @ai-sdk/openai v3 default callable always routes to the
// OpenAI Responses API (/v1/responses), which NVIDIA doesn't support. .chat() forces
// the OpenAIChatLanguageModel which uses /v1/chat/completions.
export const nemotronNano = nvidia.chat('nvidia/nemotron-3-nano-30b-a3b')