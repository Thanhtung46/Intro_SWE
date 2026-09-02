/**
 * Create a few browse-visible groups (admin ≠ viewer) so thaicuongpk sees
 * cover cards on Groups homepage. Own groups are hidden from browse by design.
 */
import { parseCreateGroupDto } from '../src/domains/groups/dto/create-group.dto.js';
import * as groupService from '../src/domains/groups/service/group.service.js';
import pool from '../src/shared/database/pool.js';

const VIEWER_EMAIL = (process.env.HOST_EMAIL || 'thaicuongpk@gmail.com').trim().toLowerCase();
const stamp = Date.now();

const IMG = {
  football:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  football2:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80',
  badminton:
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  logoF:
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
  logoB:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=400&q=80',
};

const { rows: viewers } = await pool.query(
  `SELECT user_id FROM schema_auth.users WHERE lower(email) = lower($1)`,
  [VIEWER_EMAIL],
);
const viewerId = viewers[0]?.user_id;
if (!viewerId) {
  console.error('viewer not found');
  process.exit(1);
}

const { rows: admins } = await pool.query(
  `SELECT u.user_id, u.email, p.full_name
   FROM schema_auth.users u
   LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
   WHERE u.user_id <> $1
     AND u.email_verified_at IS NOT NULL
     AND u.role_selected_at IS NOT NULL
     AND u.status = 'ACTIVE'
   ORDER BY u.user_id ASC
   LIMIT 1`,
  [viewerId],
);
if (!admins[0]) {
  console.error('No other verified user to act as group admin');
  process.exit(1);
}
const adminId = Number(admins[0].user_id);
console.log('Browse groups admin:', admins[0]);

const specs = [
  {
    sport: 'FOOTBALL',
    name: `Thảo Điền Night Kick ${stamp}`,
    title: '5v5 tối · mở join',
    description:
      'Group demo trên homepage browse (admin khác). Cover Unsplash để test card.',
    joinMode: 'AUTO',
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    coverUrl: IMG.football,
    logoUrl: IMG.logoF,
    venueName: 'Sân Thảo Điền',
    venueAddress: '21 Thảo Điền, Quận 2, TP.HCM',
    province: '79',
    city: '769',
    latitude: 10.8021,
    longitude: 106.7397,
    courts: [{ name: 'Pitch A' }],
    recurringSlots: [
      { dayOfWeek: 3, startsAt: '19:00', durationMinutes: 90, courtName: 'Pitch A' },
    ],
  },
  {
    sport: 'BADMINTON',
    name: `Phú Mỹ Smash Club ${stamp}`,
    title: 'Cầu lông all levels',
    description: 'Group badminton browse demo — cover + logo đầy đủ.',
    joinMode: 'APPROVAL',
    allLevels: true,
    coverUrl: IMG.badminton,
    logoUrl: IMG.logoB,
    venueName: 'Sân Cầu Lông Phú Mỹ',
    venueAddress: '12 Nguyễn Văn Linh, Quận 7, TP.HCM',
    province: '79',
    city: '778',
    latitude: 10.7295,
    longitude: 106.7218,
    courts: [{ name: 'Court 1' }],
    recurringSlots: [
      { dayOfWeek: 6, startsAt: '18:00', durationMinutes: 120, courtName: 'Court 1' },
    ],
  },
  {
    sport: 'FOOTBALL',
    name: `HHT Sunday 7s ${stamp}`,
    title: '7v7 Chủ nhật',
    description: 'Group football browse demo tại Hoàng Hoa Thám.',
    joinMode: 'APPROVAL',
    skillMin: 'REC_ADVANCED',
    skillMax: 'PROFESSIONAL',
    coverUrl: IMG.football2,
    logoUrl: IMG.logoF,
    venueName: 'Sân Hoàng Hoa Thám',
    venueAddress: '152 Hoàng Hoa Thám, Phú Nhuận, TP.HCM',
    province: '79',
    city: '768',
    latitude: 10.7994,
    longitude: 106.6492,
    courts: [{ name: 'Main' }],
    recurringSlots: [
      { dayOfWeek: 7, startsAt: '16:00', durationMinutes: 120, courtName: 'Main' },
    ],
  },
];

const created = [];
for (const spec of specs) {
  const dto = parseCreateGroupDto(spec);
  const result = await groupService.createGroup(adminId, dto);
  created.push({
    groupId: result.group?.groupId,
    name: result.group?.name,
    sport: spec.sport,
    coverUrl: result.group?.coverUrl,
  });
}

console.log(JSON.stringify({ viewerEmail: VIEWER_EMAIL, adminEmail: admins[0].email, created }, null, 2));
await pool.end();
