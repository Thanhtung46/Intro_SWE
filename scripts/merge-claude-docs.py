#!/usr/bin/env python3
"""Resolve CLAUDE.md merge conflicts (monorepo + backend)."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git_show(ref: str, path: str) -> str:
    return subprocess.check_output(
        ['git', 'show', f'{ref}:{path}'],
        text=True,
        encoding='utf-8',
        cwd=ROOT,
    )


def section(text: str, start: str, end: str) -> str:
    i = text.find(start)
    if i < 0:
        return ''
    j = text.find(end, i + len(start))
    if j < 0:
        return text[i:].strip()
    return text[i:j].strip()


def strip_conflicts(text: str) -> str:
    return re.sub(
        r'<<<<<<< HEAD\n.*?\n=======\n.*?\n>>>>>>> [^\n]+\n',
        '',
        text,
        flags=re.DOTALL,
    )


# --- Intro_SWE/CLAUDE.md ---
intro_head = git_show('HEAD', 'CLAUDE.md')
intro_merge = git_show('MERGE_HEAD', 'CLAUDE.md')

# Manual merge for known conflict blocks in intro
intro = intro_merge
# Backend snapshot bullet list: combine
snapshot_old = intro[intro.find('<<<<<<< HEAD'):intro.find('>>>>>>> SPOT-76') + 80] if '<<<<<<< HEAD' in intro else ''
if '<<<<<<< HEAD' in intro:
    merged_snapshot = """- **Schedule / notifications / reviews:** personal schedule + seed; inbox + T-24h/T-2h reminders + match cancel types + **group/tournament join types**; venue reviews + reply; **pickup kèo host reviews** (`POST /matches/:id/review`); **referee** inbox `REFEREE_INVITATION` / `REFEREE_RATING_REQUEST`
- **Matchmaking (kèo):** browse/list/detail/join/mine/my-join-requests; lifecycle expiry worker; Manage Squad fields; post-match review + `summary`; host `rating` live on cards/profile
- **Groups (hội) G0–G5:** create/browse/detail; join AUTO/APPROVAL; mine/favorites; admin PATCH + courts/slots; members/schedule matrix/gallery; kick/transfer/leave/delete; inbox notifications — Figma Manage `101:2`, detail tabs `810:*`. Product locks: skill **hard gate** on join; `memberCount` = admin + accepted only (**PENDING không tính**). Detail: [`spot-backend/CLAUDE.md`](./spot-backend/CLAUDE.md) section **Groups (hội)**; contract: [`spot-backend/docs/API.md`](./spot-backend/docs/API.md) §8.
- **Tournaments (giải đấu) T0–T5:** create/browse/detail/join (captain + APPROVAL); mine/favorites; organizer manage; matches + results; standings PTS; PATCH winners + in-team ranks; lifecycle worker — Figma browse `880:404`, detail tabs Overview/Matches/Standings/Players. Product locks: [`spot-backend/docs/TOURNAMENT_PLAN.md`](./spot-backend/docs/TOURNAMENT_PLAN.md). **FE contract:** [`spot-backend/docs/API.md`](./spot-backend/docs/API.md) §9.
- **Referee domain:** Job Board, invitations **Plan A** (`myVenues` + Pending Queue), hire-referee fan-out, player rating — see **Referee (FE contract)** below.
- **Migrations:** `001` auth → `014` tournaments → **`015`–`020` admin + referee**. Run `npm run migrate` after pull.
- **Not yet:** JWT refresh rotate/blacklist; booking **payment gateway** (non-prod: `POST /bookings/:id/dev/mark-paid`); FCM device push; Admin UI approvals; referee **venue favourite + board province/city filter** (planned MVP)
"""
    intro = re.sub(
        r'- \*\*Schedule / notifications / reviews:\*\*.*?>>>>>>> SPOT-76-Matches-Homepage-0-Implement-UI-API-per-Figma\n',
        merged_snapshot,
        intro,
        flags=re.DOTALL,
    )

smoke_merged = """npm run smoke:matches    # host / join / approve / kick / mine / cancel
npm run smoke:groups     # create / join / PATCH flush / members / schedule / gallery / kick / transfer / delete
npm run smoke:tournaments
npm run smoke:referee    # OTP_DEBUG=true + seed:admin + migrate 015–020
npm run worker:reminders # rating prompt + booking reminders (prod-like)
npm run worker:match-expiry   # prod/cron — process ended kèo
"""
if '<<<<<<< HEAD' in intro:
    intro = re.sub(
        r'npm run smoke:matches.*?>>>>>>> SPOT-76-Matches-Homepage-0-Implement-UI-API-per-Figma\n',
        smoke_merged,
        intro,
        flags=re.DOTALL,
    )

intro = strip_conflicts(intro)

# Restore Referee FE contract from HEAD (not in matchmaking branch)
referee_intro = section(intro_head, '### Referee (trọng tài)', '**Figma Host form')
if referee_intro and '### Referee (trọng tài)' not in intro:
    referee_intro = referee_intro.replace(
        'migrations `009`–`013`',
        'migrations `015`–`020`',
    )
    anchor = '**Figma Host form (`99:2`) — product locked (BE + FE contract)**'
    if anchor in intro:
        intro = intro.replace(anchor, referee_intro + '\n\n' + anchor)

(ROOT / 'CLAUDE.md').write_text(intro, encoding='utf-8')

# --- spot-backend/CLAUDE.md ---
be_merge = git_show('MERGE_HEAD', 'spot-backend/CLAUDE.md')
be_head = git_show('HEAD', 'spot-backend/CLAUDE.md')
referee_block = section(be_head, '## Referee (trọng tài)', '## Env / Supabase')

be = be_merge
if '<<<<<<< HEAD' in be:
    mounts = (
        '**Mounts:** `/auth`+`/api/auth`, `/users`+`/api/users`, `/matches`+`/api/matches`, '
        '`/groups`+`/api/groups`, `/tournaments`+`/api/tournaments`, `/geo`+`/api/geo`, '
        '`/notifications`+`/api/notifications`, `/reviews`+`/api/reviews`, `/venues`+`/api/venues`, '
        '`/bookings`+`/api/bookings`, `/admin`+`/api/admin`, **`/referee`+`/api/referee`**.'
    )
    be = re.sub(
        r'\*\*Mounts:\*\*.*?>>>>>>> SPOT-76-Matches-Homepage-0-Implement-UI-API-per-Figma\n',
        mounts + '\n',
        be,
        flags=re.DOTALL,
    )

    infra = (
        '| Admin approve OWNER/REFEREE `PENDING` → `ACTIVE` | **Done** — `/admin/*`, migrations `015`–`017`, `npm run smoke:admin-approvals` |\n'
        '| **Referee domain** | **Done** — migrations `016`–`020`, `/referee/*`, reviews, notifications, `npm run smoke:referee` |\n'
        '| Other domains | `payment` still empty; **`groups` G0–G5** + **`tournaments` T0–T5** + admin + referee implemented |'
    )
    be = re.sub(
        r'\| Admin approve OWNER/REFEREE.*?>>>>>>> SPOT-76-Matches-Homepage-0-Implement-UI-API-per-Figma\n',
        infra + '\n',
        be,
        flags=re.DOTALL,
    )

    be = re.sub(
        r'<<<<<<< HEAD\n```\n/api\n```\n=======\n```\n/api\n```\n>>>>>>> SPOT-76[^\n]+\n',
        '```\n/api\n```\n',
        be,
        flags=re.DOTALL,
    )

be = strip_conflicts(be)
if referee_block and '## Referee (trọng tài)' not in be:
    # Update migration refs in referee block
    referee_block = referee_block.replace('migrations `011`–`013`', 'migrations `016`–`020`')
    referee_block = referee_block.replace('migrations `009`–`013`', 'migrations `016`–`020`')
    be = be.rstrip() + '\n\n' + referee_block + '\n'
elif '## Referee (trọng tài)' in be:
    be = re.sub(
        r'migrations `009`–`013`',
        'migrations `016`–`020`',
        be,
    )
    be = re.sub(
        r'migrations `011`–`013`',
        'migrations `016`–`020`',
        be,
    )

(ROOT / 'spot-backend/CLAUDE.md').write_text(be, encoding='utf-8')
print('Wrote CLAUDE.md files')
