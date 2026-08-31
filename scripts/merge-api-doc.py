#!/usr/bin/env python3
"""Merge spot-backend/docs/API.md after matchmaking + referee branch merge."""
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


def section(text: str, start: str, ends: list[str]) -> str:
    i = text.find(start)
    if i < 0:
        return ''
    j = len(text)
    for e in ends:
        k = text.find(e, i + len(start))
        if k >= 0:
            j = min(j, k)
    return text[i:j].strip()


merge = git_show('MERGE_HEAD', 'spot-backend/docs/API.md')
head = git_show('HEAD', 'spot-backend/docs/API.md')

# Strip any trailing link section from merge base (insert our appendix before it)
link_marker = '## Liên kết'
if link_marker in merge:
    merge = merge[: merge.rfind(link_marker)].rstrip()

admin = section(head, '## 12. Admin Console endpoints', ['## 11. Chưa có', '## 13. Chưa có', '## Venues'])
venues = section(head, '## Venues & Booking endpoints', ['## Referee endpoints'])
referee = section(head, '## Referee endpoints', ['## Liên kết'])

admin = admin.replace('## 12. Admin Console endpoints', '## 17. Admin Console endpoints')
venues = venues.replace('## Venues & Booking endpoints', '## 18. Venues & Booking endpoints')
referee = referee.replace('## Referee endpoints', '## 19. Referee endpoints')

old_types = (
    'Types: `BOOKING_CREATED` | `BOOKING_REMINDER` | `MATCH_CANCELLED` | `MATCH_EXPIRED_UNDERFILLED` | '
    '`GROUP_JOIN_REQUEST` | `GROUP_APPROVED` | `GROUP_REJECTED` | `GROUP_KICKED` | `GROUP_ADMIN_TRANSFERRED` | `SYSTEM`.'
)
new_types = (
    'Types: `BOOKING_CREATED` | `BOOKING_REMINDER` | `MATCH_CANCELLED` | `MATCH_EXPIRED_UNDERFILLED` | '
    '`GROUP_JOIN_REQUEST` | `GROUP_APPROVED` | `GROUP_REJECTED` | `GROUP_KICKED` | `GROUP_ADMIN_TRANSFERRED` | '
    '`SYSTEM` | `REFEREE_INVITATION` | `REFEREE_RATING_REQUEST`.'
)
if old_types in merge:
    merge = merge.replace(old_types, new_types)

inbox_ref = section(
    head,
    '### 8.1 Player inbox — nhắc đánh giá (FE)',
    ['## 9. Reviews endpoints', '## 12. Reviews endpoints'],
)
if 'REFEREE_RATING_REQUEST' not in merge and inbox_ref and len(inbox_ref) < 3000:
    marker = 'Opt-out (`pushNotificationsEnabled: false`):'
    if marker in merge:
        merge = merge.replace(marker, inbox_ref + '\n\n' + marker)

old_rev = '| `POST` | `/reviews` | Player tạo review cho booking `COMPLETED` |'
new_rev = (
    '| `GET` | `/reviews/hosts/:userId/reviews` | Pickup kèo — reviews host nhận từ participants (`limit`, `offset`) |\n'
    '| `POST` | `/reviews` | Player tạo review **venue** cho booking `COMPLETED` |\n'
    '| `POST` | `/reviews/referee` | Player review **trọng tài** sau trận có `hireReferee` |'
)
if old_rev in merge:
    merge = merge.replace(old_rev, new_rev)

if '### 9.2 `POST /reviews/referee`' not in merge:
    ref_review = section(
        head,
        '### 9.2 `POST /reviews/referee`',
        ['## 8. JWT', '## 10. JWT', '## 13. JWT', '**Errors (venue review)**', '### 7.5'],
    )
    if ref_review:
        anchor = '`source` là `cache` hoặc `db`.'
        if anchor in merge:
            merge = merge.replace(anchor, anchor + '\n\n' + ref_review.strip())

extra_smoke = """npm run smoke:venues         # dev-seed → list/detail/availability
npm run smoke:booking        # dev-seed → create → 409 conflict → schedule
npm run seed:admin           # upsert ADMIN user (ADMIN_SEED_* env)
npm run smoke:admin-approvals  # owner pending → verify → submit doc → admin approve
npm run smoke:referee        # referee batch → board → booking hire → accept
"""
if 'npm run smoke:referee' not in merge and 'npm run smoke:schedule' in merge:
    merge = merge.replace(
        'npm run smoke:schedule       # seed schedule → GET /users/me/schedule',
        'npm run smoke:schedule       # seed schedule → GET /users/me/schedule\n' + extra_smoke,
    )

if '| **Tournaments T0–T5**' in merge and '**Referee**' not in merge:
    merge = merge.replace(
        '| **Tournaments T0–T5**',
        '| **Referee** — Job Board, invitations Plan A, hire-referee fan-out, rating | Done (`015`–`020`) — [`REFEREE_PLAN.md`](./REFEREE_PLAN.md) |\n| **Tournaments T0–T5**',
    )

appendix = '\n\n---\n\n'.join([s for s in [admin, venues, referee] if s])
final = merge.rstrip() + '\n\n---\n\n' + appendix + '\n\n## Liên kết\n\n- Setup & Docker: [`README.md`](../README.md)\n- Ghi chú agent / schema: [`CLAUDE.md`](../CLAUDE.md)\n'

out = ROOT / 'spot-backend/docs/API.md'
out.write_text(final, encoding='utf-8')
print(f'Wrote {out} ({len(final.splitlines())} lines)')
