# AI agent prompts

Single source of truth for intake agent system prompts.  
Product behavior: `docs/SSOT/CHAT_AGENTS.md` · SRS **FR-CHAT-01 … FR-CHAT-08**.

## Layout

| Folder | Agent | Used when |
|---|---|---|
| `prompts/candidate/` | Candidate (employee) intake | Free-text chat that fills the candidate card |
| `prompts/employer/` | Employer intake | Free-text chat that fills the job card |

Each folder contains `system-prompt.md` — rendered as the **system** instruction.  
Conversation turns are sent separately as `messages` (full recent history + new user turn).

## Placeholders

| Placeholder | Description |
|---|---|
| `{{known_facts}}` | Compact non-empty card facts (preferred context) |
| `{{current_card}}` | Compact JSON of filled fields only |
| `{{missing_field_key}}` | Internal next-field hint (never spoken aloud) |
| `{{pending_field_questions}}` | Employer field questions (candidate only) |
| `{{recent_agent_questions}}` | Last agent replies — do not repeat |
| `{{chat_history}}` / `{{new_message}}` | Legacy admin templates only (history is in messages) |

## Runtime wiring

`src/infrastructure/ai/prompts.ts` → `buildEmployeeConversation` / `buildEmployerConversation`  
`src/infrastructure/ai/intake.ts` → `generateObject({ system, messages })`

## Editing workflow

1. Edit the `.md` template.
2. Keep voice rules from `CHAT_AGENTS.md`.
3. Prefer natural dialogue; never mention cards / fill counts.
