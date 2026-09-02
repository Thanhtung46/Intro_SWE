/**
 * Demo catalog: real-ish HCM mini-football venues + 50 synthetic kèo drafts.
 * Not scraped live — Vmito has no FOOTBALL public feed. Dev/demo seed only.
 */

export const FOOTBALL_SEED_TAG_PREFIX = '[football-seed:';
export const FOOTBALL_SEED_NOTES = '%[football-seed:%';
export const FOOTBALL_HOST_EMAIL = 'football.%@import.spot.local';

export function footballSeedTag(slug) {
  return `${FOOTBALL_SEED_TAG_PREFIX}${slug}]`;
}

export function footballSeedMatchSql(column = 'notes') {
  return `${column} ILIKE '${FOOTBALL_SEED_NOTES}'`;
}

/** Real venue names/addresses in HCM with approximate map coords (WGS84). */
export const HCM_FOOTBALL_VENUES = Object.freeze([
  {
    id: 'hca-binh-thanh',
    venueName: 'Sân bóng HCA',
    venueAddress: '324 Chu Văn An, Phường 12, Quận Bình Thạnh, TP.HCM',
    city: '765',
    latitude: 10.81035,
    longitude: 106.70942,
  },
  {
    id: 'lanh-binh-thang',
    venueName: 'Sân bóng Lãnh Binh Thăng',
    venueAddress: 'Lãnh Binh Thăng, Quận 10, TP.HCM',
    city: '771',
    latitude: 10.77012,
    longitude: 106.66841,
  },
  {
    id: 'tao-dan',
    venueName: 'Sân bóng Tao Đàn',
    venueAddress: 'Công viên Tao Đàn, Quận 1, TP.HCM',
    city: '760',
    latitude: 10.77485,
    longitude: 106.69261,
  },
  {
    id: 'thao-dien',
    venueName: 'Sân bóng Thảo Điền',
    venueAddress: 'Thảo Điền, Thành phố Thủ Đức, TP.HCM',
    city: '769',
    latitude: 10.80291,
    longitude: 106.73618,
  },
  {
    id: 'phu-nhuan-mini',
    venueName: 'Sân bóng mini Phú Nhuận',
    venueAddress: 'Hoàng Văn Thụ, Quận Phú Nhuận, TP.HCM',
    city: '768',
    latitude: 10.79742,
    longitude: 106.67855,
  },
  {
    id: 'tan-binh-7',
    venueName: 'Sân bóng 7 người Tân Bình',
    venueAddress: 'Cộng Hòa, Quận Tân Bình, TP.HCM',
    city: '766',
    latitude: 10.80188,
    longitude: 106.65274,
  },
  {
    id: 'go-vap-mini',
    venueName: 'Sân bóng Gò Vấp',
    venueAddress: 'Quang Trung, Quận Gò Vấp, TP.HCM',
    city: '764',
    latitude: 10.83862,
    longitude: 106.66591,
  },
  {
    id: 'tan-phu-5',
    venueName: 'Sân bóng 5 người Tân Phú',
    venueAddress: 'Lũy Bán Bích, Quận Tân Phú, TP.HCM',
    city: '767',
    latitude: 10.79015,
    longitude: 106.62844,
  },
  {
    id: 'q7-pmh',
    venueName: 'Sân bóng Phú Mỹ Hưng',
    venueAddress: 'Nguyễn Lương Bằng, Quận 7, TP.HCM',
    city: '778',
    latitude: 10.72948,
    longitude: 106.72155,
  },
  {
    id: 'q8-mini',
    venueName: 'Sân bóng Quận 8',
    venueAddress: 'Dương Bá Trạc, Quận 8, TP.HCM',
    city: '776',
    latitude: 10.74022,
    longitude: 106.67618,
  },
  {
    id: 'binh-tan',
    venueName: 'Sân bóng Bình Tân',
    venueAddress: 'Tên Lửa, Quận Bình Tân, TP.HCM',
    city: '777',
    latitude: 10.75091,
    longitude: 106.60833,
  },
  {
    id: 'thu-duc-linh-trung',
    venueName: 'Sân bóng Linh Trung',
    venueAddress: 'Linh Trung, Thành phố Thủ Đức, TP.HCM',
    city: '769',
    latitude: 10.87055,
    longitude: 106.78012,
  },
  {
    id: 'q4-nguyen-huu-hao',
    venueName: 'Sân bóng Quận 4',
    venueAddress: 'Nguyễn Hữu Hào, Quận 4, TP.HCM',
    city: '773',
    latitude: 10.75841,
    longitude: 106.70288,
  },
  {
    id: 'q5-nguyen-trai',
    venueName: 'Sân bóng Quận 5',
    venueAddress: 'Nguyễn Trãi, Quận 5, TP.HCM',
    city: '774',
    latitude: 10.75622,
    longitude: 106.66941,
  },
  {
    id: 'q6-phu-lam',
    venueName: 'Sân bóng Phú Lâm',
    venueAddress: 'Hậu Giang, Quận 6, TP.HCM',
    city: '775',
    latitude: 10.74655,
    longitude: 106.63588,
  },
  {
    id: 'q11-minh-phung',
    venueName: 'Sân bóng Quận 11',
    venueAddress: 'Minh Phụng, Quận 11, TP.HCM',
    city: '772',
    latitude: 10.76288,
    longitude: 106.65012,
  },
  {
    id: 'q3-vo-thi-sau',
    venueName: 'Sân bóng Quận 3',
    venueAddress: 'Võ Thị Sáu, Quận 3, TP.HCM',
    city: '770',
    latitude: 10.78215,
    longitude: 106.68644,
  },
  {
    id: 'q12-trung-my-tay',
    venueName: 'Sân bóng Trung Mỹ Tây',
    venueAddress: 'Trung Mỹ Tây, Quận 12, TP.HCM',
    city: '761',
    latitude: 10.86241,
    longitude: 106.61855,
  },
  {
    id: 'nha-be',
    venueName: 'Sân bóng Nhà Bè',
    venueAddress: 'Huỳnh Tấn Phát, Nhà Bè, TP.HCM',
    city: '786',
    latitude: 10.67888,
    longitude: 106.73812,
  },
  {
    id: 'cu-chi',
    venueName: 'Sân bóng Củ Chi',
    venueAddress: 'Quốc lộ 22, Củ Chi, TP.HCM',
    city: '783',
    latitude: 10.97555,
    longitude: 106.49522,
  },
]);

const FORMATS = [
  { format: 'FIVE_A_SIDE', maxPlayers: 10, label: '5v5', court: 'Sân A' },
  { format: 'SEVEN_A_SIDE', maxPlayers: 14, label: '7v7', court: 'Sân 7' },
  { format: 'ELEVEN_A_SIDE', maxPlayers: 22, label: '11v11', court: 'Sân lớn' },
];

const SKILL_BANDS = [
  { allLevels: true },
  { allLevels: false, skillMin: 'LEARNING', skillMax: 'REC_ADVANCED' },
  { allLevels: false, skillMin: 'REC_BASIC', skillMax: 'SEMI_PRO' },
  { allLevels: false, skillMin: 'REC_ADVANCED', skillMax: 'ELITE' },
];

const COVER_URLS = [
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
];

const HOST_NAMES = [
  'Minh Quân',
  'Hoàng Nam',
  'Đức Anh',
  'Tuấn Kiệt',
  'Thành Đạt',
  'Quốc Bảo',
  'Hữu Phước',
  'Văn Khoa',
  'Nhật Minh',
  'Gia Huy',
];

function nextSlotStart(index) {
  // Unique 2h slots from tomorrow 17:00 — same venue (every 20 drafts) never overlaps.
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(17, 0, 0, 0);
  if (start.getTime() <= Date.now()) {
    start.setDate(start.getDate() + 1);
  }
  start.setTime(start.getTime() + index * 2 * 60 * 60 * 1000);
  return start;
}

/**
 * Build `count` FOOTBALL drafts ready for syncVmitoDrafts-compatible shape
 * (spotCreateBody + hostId/slug + syncEligible).
 */
export function buildFootballSeedDrafts(count = 50) {
  const drafts = [];
  const venues = HCM_FOOTBALL_VENUES;

  for (let i = 0; i < count; i += 1) {
    const venue = venues[i % venues.length];
    const fmt = FORMATS[i % FORMATS.length];
    const skills = SKILL_BANDS[i % SKILL_BANDS.length];
    const hostIdx = i % HOST_NAMES.length;
    const hostId = `fb-host-${hostIdx + 1}`;
    const slug = `fb-${venue.id}-${String(i + 1).padStart(2, '0')}`;
    const startsAt = nextSlotStart(i);
    const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);
    const weekday = startsAt.toLocaleDateString('vi-VN', { weekday: 'short' });
    const title = `Kèo ${fmt.label} ${venue.venueName} (${weekday})`;
    const importTag = footballSeedTag(slug);
    const notes = [
      `Demo seed bóng đá — không phải data Vmito.`,
      `Sân: ${venue.venueName}`,
      `Format: ${fmt.label}`,
      importTag,
    ].join('\n\n');

    const spotCreateBody = {
      sport: 'FOOTBALL',
      format: fmt.format,
      title: title.slice(0, 150),
      notes: notes.slice(0, 2000),
      coverUrl: COVER_URLS[i % COVER_URLS.length],
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      province: '79',
      city: venue.city,
      latitude: venue.latitude,
      longitude: venue.longitude,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPlayers: fmt.maxPlayers,
      joinMode: i % 3 === 0 ? 'APPROVAL' : 'AUTO',
      feeType: 'SPLIT_EVENLY',
      priceMin: fmt.format === 'ELEVEN_A_SIDE' ? 2000000 : fmt.format === 'SEVEN_A_SIDE' ? 1400000 : 900000,
      courts: [{ name: fmt.court }],
      ...(skills.allLevels
        ? { allLevels: true }
        : { allLevels: false, skillMin: skills.skillMin, skillMax: skills.skillMax }),
    };

    drafts.push({
      slug,
      hostId,
      hostName: HOST_NAMES[hostIdx],
      hostPhone: `090${String(10000000 + hostIdx * 111111).slice(0, 8)}`,
      syncEligible: true,
      supportedProvince: true,
      provinceCode: '79',
      spotCreateBody,
    });
  }

  return drafts;
}
