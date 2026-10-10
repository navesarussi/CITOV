# Prompt design (CITOV agents)

## Model & transport

- **Chat intake:** Gemini 2.5 Flash via AI SDK (`generateObject` / `streamText` on `/api/chat`).
- **Embeddings:** `gemini-embedding-001` (768d) for hybrid matching segments.
- **System text:** File defaults under `prompts/*/system-prompt.md`, overridden by `admin_settings` when saved from the admin workbench.

## Structure

1. **Role & persona** — The agent is always CITOV’s interviewer, never the logged-in user. Account-holder name may appear in a separate context block only.
2. **Grounding** — Answer only from chat history + `{{known_facts}}` + card JSON; no fabrication.
3. **Pacing** — One question per turn; warm acknowledgment + single follow-up.
4. **Output** — Structured intake (`reply`, `patch`, `fieldAnswers`) for employees; employers similar with `jobPatch`.
5. **Runtime blocks** — Code appends conflict/inference notes, agent-identity block, and CV-welcome notes; these are not edited in the markdown files.

## Placeholders

| Token | Meaning |
|--------|---------|
| `{{known_facts}}` | Human-readable facts already on the card |
| `{{current_card}}` | Compact JSON snapshot |
| `{{missing_field_key}}` | Next suggested field (internal hint) |
| `{{pending_field_questions}}` | Domain questions awaiting answers |
| `{{recent_agent_questions}}` | Anti-repetition guard |

Conversation history is sent as native `messages`, not placeholders.

## Versioning

- `PROMPT_BUNDLE_VERSION` in code bumps when default files change materially.
- Admin saves store `prompt_bundle_version` + `updated_at` / `updated_by`.
- Reset in admin clears DB override and reloads files.

## Pricing logged

Token usage is stored in `ai_usage` with types (`employee_intake`, `cv_import`, `embedding`, …). Cost uses `src/domain/ai-pricing.ts` (Flash + embedding list rates).

When the provider returns cache read counts, we persist `cached_prompt_tokens` on each row and show **estimated cache savings** on the admin dashboard (75% discount vs full input price for cached tokens — see `GEMINI_CACHED_INPUT_MULTIPLIER`).

## Prompt caching (Gemini Flash + AI SDK)

### What we implemented

1. **Implicit prefix caching (Gemini 2.5 Flash)** — Google may cache the **longest stable prefix** of a request when the same prefix repeats within a short TTL. No separate `cachedContent` resource is required for this mode.
2. **Prompt layout** — `src/infrastructure/ai/prompts.ts` splits each turn into:
   - **Static `system` message:** persona, rules, placeholder *hints* (not live card JSON).
   - **First user message:** dynamic context (`known_facts`, card snapshot, missing field, pending questions, CV notes).
   - **Remaining messages:** chat history (also dynamic).
3. **Usage extraction** — `extractGeminiUsage()` maps AI SDK usage to `cachedPromptTokens` via `usage.inputTokenDetails.cacheReadTokens` (or legacy `cachedInputTokens`).

### Explicit context caching API

Gemini also supports **cached content** resources (create once, reference by name on later calls). The Vercel `@ai-sdk/google` provider can pass provider options for cached content when you manage cache lifecycle (create / TTL / delete). We did **not** wire explicit caches in production yet — implicit prefix caching is zero-ops and safe if unsupported.

### Thresholds & expectations

| Topic | Finding |
|--------|---------|
| Minimum prefix size | Google documents implicit caching for **large** repeated prefixes (often cited around **≥4096 tokens** for Flash-class models). Our default markdown system prompts are ~1–2k tokens — **may be below** the implicit threshold until admin prompts grow or history stabilizes. |
| What moves the needle | Keep **identical** static system bytes across turns; avoid timestamp/version noise in `system`; put all per-turn deltas in user messages. |
| Measurement | Compare `cached_prompt_tokens` / `prompt_tokens` on `ai_usage` after real chat sessions. Admin dashboard shows aggregate cache savings when any cached tokens are recorded. |
| If unsupported | Fields stay `0`; cost math falls back to full input pricing — no runtime errors. |

### CV extraction

CV calls use a separate system prompt in `cv-extraction.ts`; static instructions should lead the message list with document text appended after. Usage is logged the same way when cache fields appear in the response.
