# Using this repo with Cursor

This project includes a **Cursor project rule** so the Karpathy-inspired behavioral guidelines apply automatically when you work here.

## In this repository

1. Open the folder in Cursor.
2. The rule [`.cursor/rules/karpathy-guidelines.mdc`](.cursor/rules/karpathy-guidelines.mdc) is committed with `alwaysApply: true`.
3. Confirm under **Settings → Rules** that `karpathy-guidelines` appears.

## Where status actually lives

| File | What to read it for |
| :--- | :--- |
| [`CLAUDE.md`](CLAUDE.md) | Behavioral guidelines + **cross-project status** (what’s built vs scaffold) |
| [`spot-backend/CLAUDE.md`](spot-backend/CLAUDE.md) | Backend stack, APIs done, migrations, env, smoke commands |
| [`spot-backend/docs/API.md`](spot-backend/docs/API.md) | Full REST contract for FE / Postman |
| [`DOCKER.md`](DOCKER.md) | Compose ports, backend + Redis, production `--env-file` |
| [`PROJECT_RULES.md`](PROJECT_RULES.md) | Version locks & engineering rules (aspirational where noted) |
| Each `spot-*/CLAUDE.md` | App-specific status before editing that app |

**Backend (tracked in this repo) is runnable** — auth, profile/`user_profiles`, settings preferences, schedule, notifications, reviews. Do not follow outdated “no `package.json` / no backend” notes if you still see them elsewhere.

## Use the same guidelines in another project

**Cursor:** Copy `.cursor/rules/karpathy-guidelines.mdc` into that project’s `.cursor/rules/`.

**Other tools:** Copy or merge root [`CLAUDE.md`](CLAUDE.md) principles (sections 1–4) into that project’s instruction file.

## Optional: personal Agent Skills

Reusable skill text: [`skills/karpathy-guidelines/SKILL.md`](skills/karpathy-guidelines/SKILL.md) → copy/symlink under `~/.cursor/skills` if you use that layout.

## Claude Code vs Cursor

- **Claude Code:** Per-project guidance via `CLAUDE.md` (root + app-scoped).
- **Cursor:** Uses `.cursor/rules/` automatically; also read `CLAUDE.md` for project status (Cursor does not auto-load `CLAUDE.md` as rules unless you point at it).

## For contributors

When you change the four principles, keep **[`CLAUDE.md`](CLAUDE.md)** and **[`.cursor/rules/karpathy-guidelines.mdc`](.cursor/rules/karpathy-guidelines.mdc)** in sync. When backend/frontend **status** changes, update root `CLAUDE.md` + the relevant `spot-*/CLAUDE.md` (and `README.md` tables) so the next person is not working from stale scaffold notes.
