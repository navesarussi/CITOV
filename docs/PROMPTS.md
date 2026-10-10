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
