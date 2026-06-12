import Groq from 'groq-sdk'

/* ── Singleton Groq client ──────────────────────────────────────────
   Initialised once and reused across all requests.
   The SDK reads GROQ_API_KEY from process.env automatically.    ── */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export default groq