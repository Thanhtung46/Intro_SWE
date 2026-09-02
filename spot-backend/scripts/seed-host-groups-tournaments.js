/**
 * Seed demo groups + tournaments for an existing host (service layer → DB).
 * Mirrors `npm run seed:football` style — run from host / docker, no FE needed.
 *
 * Tournament create gate is auto-seeded when missing:
 *   - hosted COMPLETED matches >= 80
 *   - host avg rating >= 4.5
 *
 * Usage:
 *   npm run seed:host-gt
 *   npm run seed:host-gt -- --groups 10 --tournaments 10
 *   npm run seed:host-gt -- --groups 5 --tournaments 1 --badminton-only
 *   HOST_EMAIL=thaicuongpk@gmail.com HOST_PASSWORD='Cuong@123' npm run seed:host-gt
 *
 * Docker:
 *   docker exec spot-backend npm run seed:host-gt -- --groups 10 --tournaments 10
 */
import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import { TOURNAMENT_CREATE_ELIGIBILITY } from '../src/shared/constants/tournaments.js';
import { getHostRatingForUser } from '../src/domains/review/service/match-host-review.service.js';
import * as matchRepository from '../src/domains/matchmaking/repository/match.repository.js';
import { parseCreateGroupDto } from '../src/domains/groups/dto/create-group.dto.js';
import * as groupService from '../src/domains/groups/service/group.service.js';
import { parseCreateTournamentDto } from '../src/domains/tournaments/dto/create-tournament.dto.js';
import * as tournamentService from '../src/domains/tournaments/service/tournament.service.js';

const DEFAULT_EMAIL = 'thaicuongpk@gmail.com';
const DEFAULT_PASSWORD = 'Cuong@123';

const IMG = {
  footballCover:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  footballNight:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80',
  footballCrowd:
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
  footballPitch:
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80',
  logoFootball:
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
  badmintonCover:
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  badmintonCourt:
    'https://images.unsplash.com/photo-1613918431703-aa504341a3b8?auto=format&fit=crop&w=1200&q=80',
  badmintonAction:
    'https://images.unsplash.com/photo-1599394022918-6c2771930aea?auto=format&fit=crop&w=1200&q=80',
  logoBadminton:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=400&q=80',
};

/** HCM venues with valid pre-2025 province/city codes. */
const VENUES = [
  {
    venueName: 'Sân Thảo Điền',
    venueAddress: '21 Thảo Điền, Quận 2, TP.HCM',
    province: '79',
    city: '769',
    latitude: 10.8021,
    longitude: 106.7397,
  },
  {
    venueName: 'Sân Phú Mỹ Hưng',
    venueAddress: '8 Nguyễn Lương Bằng, Quận 7, TP.HCM',
    province: '79',
    city: '778',
    latitude: 10.7292,
    longitude: 106.7215,
  },
  {
    venueName: 'Sân Hoàng Hoa Thám',
    venueAddress: '152 Hoàng Hoa Thám, Phú Nhuận, TP.HCM',
    province: '79',
    city: '768',
    latitude: 10.7994,
    longitude: 106.6492,
  },
  {
    venueName: 'Sân Cầu Lông Phú Mỹ',
    venueAddress: '12 Nguyễn Văn Linh, Quận 7, TP.HCM',
    province: '79',
    city: '778',
    latitude: 10.7295,
    longitude: 106.7218,
  },
  {
    venueName: 'Sân Tân Bình Sports',
    venueAddress: '45 Cộng Hòa, Tân Bình, TP.HCM',
    province: '79',
    city: '766',
    latitude: 10.8015,
    longitude: 106.6528,
  },
];

const GROUP_TEMPLATES = [
  {
    sport: 'FOOTBALL',
    name: 'Saigon Evening 5s',
    title: 'Kèo tối 5 người · Thảo Điền',
    description:
      'CLB bóng đá phong trào tối thứ Ba & Năm. APPROVAL join. Mang giày TF + áo sáng/tối.',
    joinMode: 'APPROVAL',
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    coverUrl: IMG.footballNight,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/saigon-evening-5s',
    courts: [{ name: 'Pitch A' }, { name: 'Pitch B' }],
    recurringSlots: [
      { dayOfWeek: 2, startsAt: '19:00', durationMinutes: 90, courtName: 'Pitch A' },
      { dayOfWeek: 4, startsAt: '19:00', durationMinutes: 90, courtName: 'Pitch B' },
    ],
    venueIndex: 0,
  },
  {
    sport: 'BADMINTON',
    name: 'District 7 Smash',
    title: 'Cầu lông tối · đôi / đơn',
    description:
      'Nhóm cầu lông Quận 7 — all levels, join AUTO. Lịch T7 tối + CN sáng.',
    joinMode: 'AUTO',
    allLevels: true,
    coverUrl: IMG.badmintonCover,
    logoUrl: IMG.logoBadminton,
    zaloUrl: 'https://zalo.me/g/d7-smash',
    courts: [{ name: 'Court 1' }, { name: 'Court 2' }],
    recurringSlots: [
      { dayOfWeek: 6, startsAt: '18:00', durationMinutes: 120, courtName: 'Court 1' },
      { dayOfWeek: 7, startsAt: '09:00', durationMinutes: 120, courtName: 'Court 2' },
    ],
    venueIndex: 3,
  },
  {
    sport: 'FOOTBALL',
    name: 'Sunday League Crew',
    title: '7v7 Chủ nhật · HHT',
    description: '7v7 cuối tuần tại Hoàng Hoa Thám. Duyệt join theo trình.',
    joinMode: 'APPROVAL',
    skillMin: 'REC_ADVANCED',
    skillMax: 'PROFESSIONAL',
    coverUrl: IMG.footballCrowd,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/sunday-league',
    courts: [{ name: 'Main' }],
    recurringSlots: [
      { dayOfWeek: 7, startsAt: '16:00', durationMinutes: 120, courtName: 'Main' },
    ],
    venueIndex: 2,
  },
  {
    sport: 'FOOTBALL',
    name: 'PMH Morning Kick',
    title: '5v5 sáng · Phú Mỹ Hưng',
    description: 'Kick sáng thứ Bảy. AUTO join, trình Rec basic → Semi-pro.',
    joinMode: 'AUTO',
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    coverUrl: IMG.footballPitch,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/pmh-morning',
    courts: [{ name: 'Field 1' }],
    recurringSlots: [
      { dayOfWeek: 6, startsAt: '07:00', durationMinutes: 90, courtName: 'Field 1' },
    ],
    venueIndex: 1,
  },
  {
    sport: 'BADMINTON',
    name: 'Tan Binh Racket Club',
    title: 'Cầu lông Tân Bình · duyệt',
    description: 'CLB cầu lông tối thứ Hai/Tư. APPROVAL — giữ trình Avg+ trở lên.',
    joinMode: 'APPROVAL',
    skillMin: 'AVERAGE_PLUS',
    skillMax: 'PROFESSIONAL',
    coverUrl: IMG.badmintonCourt,
    logoUrl: IMG.logoBadminton,
    zaloUrl: 'https://zalo.me/g/tanbinh-racket',
    courts: [{ name: 'Sân 1' }, { name: 'Sân 2' }],
    recurringSlots: [
      { dayOfWeek: 1, startsAt: '19:30', durationMinutes: 90, courtName: 'Sân 1' },
      { dayOfWeek: 3, startsAt: '19:30', durationMinutes: 90, courtName: 'Sân 2' },
    ],
    venueIndex: 4,
  },
  {
    sport: 'FOOTBALL',
    name: 'Q7 Night Owls',
    title: '11v11 tối · PMH',
    description: 'Buổi tối thứ Sáu phong trào nâng cao. Duyệt join.',
    joinMode: 'APPROVAL',
    skillMin: 'REC_ADVANCED',
    skillMax: 'ELITE',
    coverUrl: IMG.footballCover,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/q7-night-owls',
    courts: [{ name: 'Pitch A' }],
    recurringSlots: [
      { dayOfWeek: 5, startsAt: '20:00', durationMinutes: 120, courtName: 'Pitch A' },
    ],
    venueIndex: 1,
  },
  {
    sport: 'BADMINTON',
    name: 'Thao Dien Shuttle',
    title: 'Cầu lông Thảo Điền · all levels',
    description: 'Open play CN chiều. Join AUTO.',
    joinMode: 'AUTO',
    allLevels: true,
    coverUrl: IMG.badmintonAction,
    logoUrl: IMG.logoBadminton,
    zaloUrl: 'https://zalo.me/g/thaodien-shuttle',
    courts: [{ name: 'Court A' }],
    recurringSlots: [
      { dayOfWeek: 7, startsAt: '15:00', durationMinutes: 120, courtName: 'Court A' },
    ],
    venueIndex: 0,
  },
  {
    sport: 'FOOTBALL',
    name: 'Phu Nhuan Midweek',
    title: '5v5 giữa tuần · HHT',
    description: 'Thứ Tư tối thân thiện. AUTO join.',
    joinMode: 'AUTO',
    skillMin: 'LEARNING',
    skillMax: 'REC_ADVANCED',
    coverUrl: IMG.footballNight,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/pn-midweek',
    courts: [{ name: 'Court 1' }, { name: 'Court 2' }],
    recurringSlots: [
      { dayOfWeek: 3, startsAt: '19:00', durationMinutes: 90, courtName: 'Court 1' },
    ],
    venueIndex: 2,
  },
  {
    sport: 'BADMINTON',
    name: 'PMH Doubles Hub',
    title: 'Đôi hỗn hợp · Phú Mỹ',
    description: 'Ưu tiên doubles / mixed. Duyệt theo skill Avg− → Pro.',
    joinMode: 'APPROVAL',
    skillMin: 'AVERAGE_MINUS',
    skillMax: 'PROFESSIONAL',
    coverUrl: IMG.badmintonCover,
    logoUrl: IMG.logoBadminton,
    zaloUrl: 'https://zalo.me/g/pmh-doubles',
    courts: [{ name: 'Court 1' }, { name: 'Court 2' }, { name: 'Court 3' }],
    recurringSlots: [
      { dayOfWeek: 2, startsAt: '18:30', durationMinutes: 120, courtName: 'Court 1' },
      { dayOfWeek: 5, startsAt: '18:30', durationMinutes: 120, courtName: 'Court 2' },
    ],
    venueIndex: 3,
  },
  {
    sport: 'FOOTBALL',
    name: 'Tan Binh Weekend XI',
    title: '11v11 cuối tuần · Tân Bình',
    description: 'Chủ nhật sáng 11 người. APPROVAL, trình Rec advanced+.',
    joinMode: 'APPROVAL',
    skillMin: 'REC_ADVANCED',
    skillMax: 'SEMI_PRO',
    coverUrl: IMG.footballCrowd,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/tb-weekend-xi',
    courts: [{ name: 'Main Pitch' }],
    recurringSlots: [
      { dayOfWeek: 7, startsAt: '08:00', durationMinutes: 120, courtName: 'Main Pitch' },
    ],
    venueIndex: 4,
  },
];

const TOURNAMENT_TEMPLATES = [
  {
    sport: 'FOOTBALL',
    format: 'FIVE_A_SIDE',
    genderDivision: 'MEN',
    title: 'Saigon 5s Cup',
    coverUrl: IMG.footballCover,
    description:
      'Giải 5 người mở đăng ký. Vòng bảng 1 lượt → knockout. Seed demo.',
    maxTeams: 8,
    registrationFeeVnd: 500_000,
    prizePoolVnd: 5_000_000,
    startInDays: 14,
    durationHours: 8,
    deadlineInDays: 10,
    venueIndex: 0,
  },
  {
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    genderDivision: 'MEN',
    title: 'District 7 Champions 7v7',
    coverUrl: IMG.footballNight,
    description: 'Giải 7v7 cuối tuần Quận 7. Seed demo.',
    maxTeams: 8,
    registrationFeeVnd: 800_000,
    prizePoolVnd: 8_000_000,
    startInDays: 21,
    durationHours: 10,
    deadlineInDays: 16,
    venueIndex: 1,
  },
  {
    sport: 'BADMINTON',
    format: 'MD',
    title: 'HCMC Men Doubles Open',
    coverUrl: IMG.badmintonCover,
    description: 'Giải đôi nam. BO3 × 15 điểm. Seed demo.',
    maxTeams: 16,
    registrationFeeVnd: 200_000,
    prizePoolVnd: 2_000_000,
    startInDays: 12,
    durationHours: 12,
    deadlineInDays: 8,
    venueIndex: 3,
  },
  {
    sport: 'BADMINTON',
    format: 'MS',
    title: 'Saigon Singles Challenge',
    coverUrl: IMG.badmintonAction,
    description: 'Giải đơn nam mở. BO3 × 15. Seed demo.',
    maxTeams: 32,
    registrationFeeVnd: 150_000,
    prizePoolVnd: 1_500_000,
    startInDays: 18,
    durationHours: 14,
    deadlineInDays: 12,
    venueIndex: 3,
  },
  {
    sport: 'FOOTBALL',
    format: 'ELEVEN_A_SIDE',
    genderDivision: 'MEN',
    title: 'HCMC 11v11 Classic',
    coverUrl: IMG.footballCrowd,
    description: 'Giải 11 người. Seed demo.',
    maxTeams: 8,
    registrationFeeVnd: 1_500_000,
    prizePoolVnd: 15_000_000,
    startInDays: 28,
    durationHours: 12,
    deadlineInDays: 21,
    venueIndex: 2,
  },
  {
    sport: 'BADMINTON',
    format: 'MIXED',
    title: 'Phu My Mixed Doubles',
    coverUrl: IMG.badmintonCourt,
    description: 'Đôi hỗn hợp. BO3 × 15. Seed demo.',
    maxTeams: 12,
    registrationFeeVnd: 250_000,
    prizePoolVnd: 2_500_000,
    startInDays: 16,
    durationHours: 10,
    deadlineInDays: 11,
    venueIndex: 3,
  },
  {
    sport: 'FOOTBALL',
    format: 'FIVE_A_SIDE',
    genderDivision: 'WOMEN',
    title: 'Ladies 5s Night Cup',
    coverUrl: IMG.footballPitch,
    description: 'Giải 5 nữ. Seed demo.',
    maxTeams: 6,
    registrationFeeVnd: 400_000,
    prizePoolVnd: 4_000_000,
    startInDays: 20,
    durationHours: 8,
    deadlineInDays: 15,
    venueIndex: 0,
  },
  {
    sport: 'BADMINTON',
    format: 'WD',
    title: 'Tan Binh Women Doubles',
    coverUrl: IMG.badmintonCover,
    description: 'Đôi nữ. BO3 × 15. Seed demo.',
    maxTeams: 12,
    registrationFeeVnd: 180_000,
    prizePoolVnd: 1_800_000,
    startInDays: 22,
    durationHours: 10,
    deadlineInDays: 17,
    venueIndex: 4,
  },
  {
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    genderDivision: 'WOMEN',
    title: 'Sunday Women 7s',
    coverUrl: IMG.footballNight,
    description: '7v7 nữ Chủ nhật. Seed demo.',
    maxTeams: 6,
    registrationFeeVnd: 700_000,
    prizePoolVnd: 7_000_000,
    startInDays: 25,
    durationHours: 9,
    deadlineInDays: 19,
    venueIndex: 1,
  },
  {
    sport: 'BADMINTON',
    format: 'WS',
    title: 'HCMC Women Singles Open',
    coverUrl: IMG.badmintonAction,
    description: 'Đơn nữ mở. BO3 × 15. Seed demo.',
    maxTeams: 24,
    registrationFeeVnd: 150_000,
    prizePoolVnd: 1_500_000,
    startInDays: 19,
    durationHours: 12,
    deadlineInDays: 13,
    venueIndex: 3,
  },
];

function parseArgs(argv) {
  const args = {
    groups: 10,
    tournaments: 10,
    email: (process.env.HOST_EMAIL || DEFAULT_EMAIL).trim().toLowerCase(),
    password: process.env.HOST_PASSWORD || DEFAULT_PASSWORD,
    badmintonOnly: false,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--badminton-only') args.badmintonOnly = true;
    else if (arg === '--groups') args.groups = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === '--tournaments') args.tournaments = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === '--email') args.email = String(argv[++i] || '').trim().toLowerCase();
    else if (arg === '--password') args.password = String(argv[++i] || '');
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/seed-host-groups-tournaments.js [options]
  --groups N          number of groups (default 10)
  --tournaments N     number of tournaments (default 10)
  --badminton-only    only BADMINTON templates
  --email EMAIL       host account (default ${DEFAULT_EMAIL})
  --password PWD      optional login check (default env / ${DEFAULT_PASSWORD})
  --dry-run           print plan, no writes`);
      process.exit(0);
    }
  }
  return args;
}

function fail(step, extra) {
  console.error(`FAIL ${step}`);
  if (extra !== undefined) console.error(JSON.stringify(extra, null, 2));
  process.exit(1);
}

function daysFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function pickTemplates(list, count, badmintonOnly) {
  const filtered = badmintonOnly
    ? list.filter((t) => t.sport === 'BADMINTON')
    : list;
  if (filtered.length === 0) {
    fail('no templates', { badmintonOnly, sportFilter: 'BADMINTON' });
  }
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ ...filtered[i % filtered.length], _index: i });
  }
  return out;
}

function buildGroupBody(template, stamp) {
  const venue = VENUES[template.venueIndex % VENUES.length];
  const n = template._index + 1;
  return {
    sport: template.sport,
    name: `${template.name} #${n} · ${stamp}`,
    title: template.title,
    description: template.description,
    joinMode: template.joinMode,
    ...(template.allLevels
      ? { allLevels: true }
      : { skillMin: template.skillMin, skillMax: template.skillMax }),
    coverUrl: template.coverUrl,
    logoUrl: template.logoUrl,
    zaloUrl: template.zaloUrl,
    venueName: venue.venueName,
    venueAddress: venue.venueAddress,
    province: venue.province,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
    courts: template.courts,
    recurringSlots: template.recurringSlots,
  };
}

function buildTournamentBody(template, stamp) {
  const venue = VENUES[template.venueIndex % VENUES.length];
  const n = template._index + 1;
  // Stagger starts so many seeds don't collide on same day.
  const startInDays = template.startInDays + template._index;
  const deadlineInDays = Math.max(1, template.deadlineInDays + template._index - 2);
  const startsAt = daysFromNow(startInDays, 8);
  const endsAt = new Date(startsAt.getTime() + template.durationHours * 3_600_000);
  const registrationDeadline = daysFromNow(Math.min(deadlineInDays, startInDays), 23);
  return {
    sport: template.sport,
    format: template.format,
    ...(template.genderDivision ? { genderDivision: template.genderDivision } : {}),
    title: `${template.title} #${n} · ${stamp}`,
    coverUrl: template.coverUrl,
    description: template.description,
    venueName: venue.venueName,
    venueAddress: venue.venueAddress,
    province: venue.province,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    maxTeams: template.maxTeams,
    registrationFeeVnd: template.registrationFeeVnd,
    prizePoolVnd: template.prizePoolVnd,
  };
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.email, u.status, u.email_verified_at, u.role_selected_at,
            p.full_name
     FROM schema_auth.users u
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function ensureReviewer(hostUserId, stamp) {
  const { rows } = await pool.query(
    `SELECT user_id FROM schema_auth.users
     WHERE user_id <> $1
       AND email_verified_at IS NOT NULL
       AND role_selected_at IS NOT NULL
     ORDER BY user_id ASC
     LIMIT 1`,
    [hostUserId],
  );
  if (rows[0]) return Number(rows[0].user_id);

  const email = `seed.reviewer.${stamp}@example.com`;
  const phone = `09${String(stamp).slice(-8)}`;
  const inserted = await pool.query(
    `INSERT INTO schema_auth.users (
       email, password_hash, phone_number, status, email_verified_at, role_selected_at, role
     ) VALUES (
       $1, 'SEED_PLACEHOLDER', $2, 'ACTIVE', NOW(), NOW(), 'PLAYER'
     )
     RETURNING user_id`,
    [email, phone],
  );
  const reviewerId = Number(inserted.rows[0].user_id);
  await pool.query(
    `INSERT INTO schema_auth.user_profiles (user_id, full_name, gender)
     VALUES ($1, 'Seed Reviewer', 'male')
     ON CONFLICT (user_id) DO NOTHING`,
    [reviewerId],
  );
  return reviewerId;
}

async function seedEligibility(hostUserId, reviewerUserId, stamp) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const completed = await matchRepository.countCompletedHostedByUser(
      client,
      hostUserId,
    );
    const need = Math.max(
      0,
      TOURNAMENT_CREATE_ELIGIBILITY.MIN_COMPLETED_HOSTED - completed,
    );
    const startsAt = new Date(Date.now() - 86_400_000);
    const endsAt = new Date(Date.now() - 3_600_000);

    for (let i = 0; i < need; i += 1) {
      await client.query(
        `INSERT INTO schema_matchmaking.matches (
           host_user_id, sport, format, title, venue_name, venue_address,
           province, city, venue_lat, venue_lng, starts_at, ends_at,
           max_players, filled_count, skill_min, skill_max, skill_min_rank, skill_max_rank,
           fee_type, price_min, join_mode, status
         ) VALUES (
           $1, 'FOOTBALL', 'FIVE_A_SIDE', $2, 'Seed Eligibility Venue', '1 Seed St',
           '79', '778', 10.7769, 106.7009, $3, $4,
           10, 10, 'REC_BASIC', 'SEMI_PRO', 1, 5,
           'SPLIT_EVENLY', 50000, 'AUTO', 'COMPLETED'
         )`,
        [hostUserId, `Seed eligibility ${stamp}-${i}`, startsAt, endsAt],
      );
    }

    let rating = await getHostRatingForUser(client, hostUserId);
    if (
      rating?.avgRating == null ||
      rating.avgRating < TOURNAMENT_CREATE_ELIGIBILITY.MIN_AVG_HOST_RATING
    ) {
      const { rows } = await client.query(
        `SELECT match_id FROM schema_matchmaking.matches
         WHERE host_user_id = $1 AND status = 'COMPLETED'
         ORDER BY match_id DESC
         LIMIT 5`,
        [hostUserId],
      );
      for (const row of rows) {
        await client.query(
          `INSERT INTO schema_review.match_host_reviews (
             match_id, reviewer_user_id, host_user_id, rating
           ) VALUES ($1, $2, $3, 5)
           ON CONFLICT (match_id, reviewer_user_id) DO UPDATE SET rating = 5`,
          [row.match_id, reviewerUserId, hostUserId],
        );
      }
      rating = await getHostRatingForUser(client, hostUserId);
    }

    const finalCompleted = await matchRepository.countCompletedHostedByUser(
      client,
      hostUserId,
    );
    await client.query('COMMIT');
    return {
      addedCompleted: need,
      completedHostedCount: finalCompleted,
      avgRating: rating?.avgRating ?? null,
      reviewCount: rating?.reviewCount ?? 0,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function tryLogin(email, password) {
  const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    return res.status === 200 && json.accessToken ? true : false;
  } catch {
    return null; // server down — create via service anyway
  }
}

const args = parseArgs(process.argv);
const stamp = Date.now();

const user = await findUserByEmail(args.email);
if (!user) {
  fail('find user', { email: args.email, hint: 'Account not found in DB' });
}

const groupPlan = pickTemplates(GROUP_TEMPLATES, args.groups, args.badmintonOnly);
const tournamentPlan = pickTemplates(
  TOURNAMENT_TEMPLATES,
  args.tournaments,
  args.badmintonOnly,
);

console.log(
  JSON.stringify(
    {
      host: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        status: user.status,
      },
      plan: {
        groups: groupPlan.length,
        tournaments: tournamentPlan.length,
        badmintonOnly: args.badmintonOnly,
        dryRun: args.dryRun,
      },
    },
    null,
    2,
  ),
);

if (args.dryRun) {
  console.log('\n=== Dry-run group names ===');
  for (const t of groupPlan) console.log('-', buildGroupBody(t, stamp).name);
  console.log('\n=== Dry-run tournament titles ===');
  for (const t of tournamentPlan) console.log('-', buildTournamentBody(t, stamp).title);
  await pool.end();
  process.exit(0);
}

const loginOk = await tryLogin(args.email, args.password);
if (loginOk === true) console.log('\nLogin check: OK');
else if (loginOk === false) console.log('\nLogin check: failed (still seeding via service layer)');
else console.log('\nLogin check: skipped (API not reachable)');

let eligibility = null;
if (args.tournaments > 0) {
  const reviewerId = await ensureReviewer(Number(user.user_id), stamp);
  eligibility = await seedEligibility(Number(user.user_id), reviewerId, stamp);
  console.log('\n=== Eligibility ===');
  console.log(JSON.stringify(eligibility, null, 2));
  if (
    eligibility.completedHostedCount <
      TOURNAMENT_CREATE_ELIGIBILITY.MIN_COMPLETED_HOSTED ||
    eligibility.avgRating == null ||
    eligibility.avgRating < TOURNAMENT_CREATE_ELIGIBILITY.MIN_AVG_HOST_RATING
  ) {
    fail('eligibility still insufficient', eligibility);
  }
}

const createdGroups = [];
for (const template of groupPlan) {
  const body = buildGroupBody(template, stamp);
  const dto = parseCreateGroupDto(body);
  const result = await groupService.createGroup(Number(user.user_id), dto);
  createdGroups.push({
    groupId: result.group?.groupId,
    name: result.group?.name ?? body.name,
    sport: body.sport,
    joinMode: body.joinMode,
  });
}

const createdTournaments = [];
for (const template of tournamentPlan) {
  const body = buildTournamentBody(template, stamp);
  const dto = parseCreateTournamentDto(body);
  const result = await tournamentService.createTournament(Number(user.user_id), dto);
  createdTournaments.push({
    tournamentId: result.tournament?.tournamentId,
    title: result.tournament?.title ?? body.title,
    sport: body.sport,
    format: body.format,
    status: result.tournament?.status,
  });
}

console.log('\n=== Created ===');
console.log(
  JSON.stringify(
    {
      groups: createdGroups,
      tournaments: createdTournaments,
      counts: {
        groups: createdGroups.length,
        tournaments: createdTournaments.length,
      },
    },
    null,
    2,
  ),
);

await pool.end();
process.exit(0);
