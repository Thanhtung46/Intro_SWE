/**
 * Enrich seeded groups/tournaments for thaicuongpk@gmail.com:
 * cover/logo images, Zalo, rich VN descriptions, gallery photos.
 *
 *   docker exec spot-backend node scripts/enrich-host-groups-tournaments.js
 */
import pool from '../src/shared/database/pool.js';

const HOST_EMAIL = (process.env.HOST_EMAIL || 'thaicuongpk@gmail.com').trim().toLowerCase();

const IMG = {
  footballCover:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  footballNight:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80',
  footballCrowd:
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
  footballPitch:
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80',
  footballBall:
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80',
  badmintonCover:
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  badmintonCourt:
    'https://images.unsplash.com/photo-1613918431703-aa504341a3b8?auto=format&fit=crop&w=1200&q=80',
  badmintonAction:
    'https://images.unsplash.com/photo-1599394022918-6c2771930aea?auto=format&fit=crop&w=1200&q=80',
  badmintonRacket:
    'https://images.unsplash.com/photo-1622163642992-278cbd8f9f8c?auto=format&fit=crop&w=800&q=80',
  logoFootball:
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=400&q=80',
  logoBadminton:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=400&q=80',
};

const groupEnrich = [
  {
    matchNamePrefix: 'Saigon Evening 5s',
    name: 'Saigon Evening 5s',
    title: 'Kèo tối 5 người · Thảo Điền',
    description: [
      'CLB bóng đá phong trào chơi tối thứ Ba & thứ Năm tại Sân Thảo Điền.',
      '',
      '• Thể thức: 5 người / đội, xoay vòng thân thiện',
      '• Trình độ: Rec basic → Semi-pro (duyệt theo APPROVAL)',
      '• Giờ: 19:00–20:30 (Pitch A / Pitch B)',
      '• Phí sân chia đều theo buổi — báo trước nếu vắng',
      '• Mang giày đinh TF, bình nước, áo tập sáng/tối',
      '',
      'Admin duyệt join để giữ không khí vui và đúng trình. Zalo group bên dưới để báo slot.',
    ].join('\n'),
    coverUrl: IMG.footballNight,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/saigon-evening-5s',
    gallery: [IMG.footballCover, IMG.footballPitch, IMG.footballBall],
  },
  {
    matchNamePrefix: 'District 7 Smash',
    name: 'District 7 Smash',
    title: 'Cầu lông tối · Đôi / đơn mở',
    description: [
      'Nhóm cầu lông Quận 7 — mở mọi trình độ (All levels).',
      '',
      '• Sân: Cầu Lông Phú Mỹ — Court 1 & 2',
      '• Lịch: Thứ Bảy 18:00–20:00 · Chủ nhật 09:00–11:00',
      '• Join AUTO — vào group là chơi được ngay',
      '• Mang vợt + giày cầu; cầu lông nhà cung cấp theo buổi',
      '• Ưu tiên ghép đôi cân sức — newbie được welcome',
      '',
      'Chat Zalo để báo số người trước khi tới sân.',
    ].join('\n'),
    coverUrl: IMG.badmintonCover,
    logoUrl: IMG.logoBadminton,
    zaloUrl: 'https://zalo.me/g/d7-smash',
    gallery: [IMG.badmintonCourt, IMG.badmintonAction, IMG.badmintonRacket],
  },
  {
    matchNamePrefix: 'Sunday League Crew',
    name: 'Sunday League Crew',
    title: '7v7 cuối tuần · Hoàng Hoa Thám',
    description: [
      'Đội chơi 7 người Chủ nhật chiều tại Sân Hoàng Hoa Thám (152).',
      '',
      '• Trình độ: Rec advanced → Pro (APPROVAL)',
      '• Giờ: 16:00–18:00 · sân Main',
      '• Tập trung đúng giờ, đủ người mới kick-off',
      '• Không chơi thô — fair play trước tiên',
      '• Sau trận có thể coffee gần sân',
      '',
      'Muốn vào đội: gửi request kèm vài dòng về kinh nghiệm đá.',
    ].join('\n'),
    coverUrl: IMG.footballCrowd,
    logoUrl: IMG.logoFootball,
    zaloUrl: 'https://zalo.me/g/sunday-league-crew',
    gallery: [IMG.footballCover, IMG.footballNight, IMG.footballPitch],
  },
];

const tournamentEnrich = [
  {
    matchTitlePrefix: 'Saigon 5s Cup',
    title: 'Saigon 5s Cup 2026',
    coverUrl: IMG.footballCover,
    description: [
      'Giải bóng đá 5 người mở đăng ký tại Sân Thảo Điền.',
      '',
      'THÔNG TIN GIẢI',
      '• Thể thức: FIVE_A_SIDE · Nam',
      '• Số đội tối đa: 8',
      '• Lệ phí: 500.000đ / đội (display — chưa thu online)',
      '• Tổng giải thưởng: 5.000.000đ',
      '• Hosted by: SPOT',
      '',
      'LUẬT CHƠI',
      '• Mỗi đội tối đa 10 cầu thủ (5+5 dự bị)',
      '• Vòng bảng single-leg → knockout',
      '• Thời gian trận: theo lịch organizer trên tab Matches',
      '• Thẻ vàng/đỏ theo luật FIFA futsal rút gọn',
      '• Tranh chấp: quyết định trọng tài / BTC là cuối cùng',
      '',
      'ĐĂNG KÝ',
      '• Captain đăng ký team name + logo + roster (số áo unique)',
      '• Duyệt APPROVAL bởi organizer',
      '• Hạn đăng ký trước ngày giải — hết hạn nếu chưa FULL sẽ auto cancel',
    ].join('\n'),
  },
  {
    matchTitlePrefix: 'District 7 Champions 7v7',
    title: 'District 7 Champions 7v7',
    coverUrl: IMG.footballNight,
    description: [
      'Giải 7 người cuối tuần tại Phú Mỹ Hưng — Quận 7.',
      '',
      'THÔNG TIN GIẢI',
      '• Thể thức: SEVEN_A_SIDE · Nam',
      '• Số đội tối đa: 6',
      '• Lệ phí: 800.000đ / đội',
      '• Tổng giải thưởng: 8.000.000đ',
      '• Sân cố định cả giải — trận chỉ thêm giờ/ngày',
      '',
      'LUẬT CHƠI',
      '• Roster tối đa 12 người (7+5)',
      '• Mỗi cầu thủ: tên + số áo (không trùng trong đội)',
      '• Điểm vòng bảng: thắng 3 · hòa 1 · thua 0',
      '• Tie-break: GD → bàn thắng → đối đầu',
      '',
      'Captain nộp hồ sơ sớm — chỗ có hạn.',
    ].join('\n'),
  },
  {
    matchTitlePrefix: 'HCMC Doubles Open',
    title: 'HCMC Doubles Open — Men',
    coverUrl: IMG.badmintonCover,
    description: [
      'Giải cầu lông đôi nam (MD) mở tại Sân Cầu Lông Phú Mỹ.',
      '',
      'THÔNG TIN GIẢI',
      '• Thể thức: MD (Men Doubles)',
      '• Số cặp tối đa: 16',
      '• Lệ phí: 200.000đ / cặp',
      '• Tổng giải thưởng: 2.000.000đ',
      '',
      'LUẬT CHƠI',
      '• Best of 3 · mỗi set 15 điểm (BO3×15)',
      '• Roster đúng 2 vận động viên / cặp',
      '• Cầu thi đấu do BTC cung cấp theo vòng',
      '• Trang phục thể thao + giày cầu bắt buộc',
      '',
      'Captain = người đăng ký; BTC xem profile + SĐT khi duyệt.',
    ].join('\n'),
  },
];

const { rows: users } = await pool.query(
  `SELECT user_id FROM schema_auth.users WHERE lower(email) = lower($1) LIMIT 1`,
  [HOST_EMAIL],
);
if (!users[0]) {
  console.error('User not found', HOST_EMAIL);
  process.exit(1);
}
const hostUserId = Number(users[0].user_id);

const client = await pool.connect();
try {
  await client.query('BEGIN');

  const { rows: groups } = await client.query(
    `SELECT group_id, name
     FROM schema_groups.groups
     WHERE admin_user_id = $1
     ORDER BY group_id DESC`,
    [hostUserId],
  );

  const updatedGroups = [];
  for (const spec of groupEnrich) {
    const row = groups.find((g) => String(g.name).startsWith(spec.matchNamePrefix));
    if (!row) {
      console.warn('Group not found for prefix', spec.matchNamePrefix);
      continue;
    }
    await client.query(
      `UPDATE schema_groups.groups
       SET name = $2,
           title = $3,
           description = $4,
           cover_url = $5,
           logo_url = $6,
           zalo_url = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $1`,
      [
        row.group_id,
        spec.name,
        spec.title,
        spec.description,
        spec.coverUrl,
        spec.logoUrl,
        spec.zaloUrl,
      ],
    );

    await client.query(
      `DELETE FROM schema_groups.group_gallery_images WHERE group_id = $1`,
      [row.group_id],
    );
    let order = 0;
    for (const imageUrl of spec.gallery) {
      await client.query(
        `INSERT INTO schema_groups.group_gallery_images (
           group_id, image_url, uploaded_by, sort_order
         ) VALUES ($1, $2, $3, $4)`,
        [row.group_id, imageUrl, hostUserId, order],
      );
      order += 1;
    }
    updatedGroups.push({
      groupId: row.group_id,
      name: spec.name,
      galleryCount: spec.gallery.length,
    });
  }

  const { rows: tournaments } = await client.query(
    `SELECT tournament_id, title
     FROM schema_tournaments.tournaments
     WHERE organizer_user_id = $1
     ORDER BY tournament_id DESC`,
    [hostUserId],
  );

  const updatedTournaments = [];
  for (const spec of tournamentEnrich) {
    const row = tournaments.find((t) =>
      String(t.title).startsWith(spec.matchTitlePrefix),
    );
    if (!row) {
      console.warn('Tournament not found for prefix', spec.matchTitlePrefix);
      continue;
    }
    await client.query(
      `UPDATE schema_tournaments.tournaments
       SET title = $2,
           description = $3,
           cover_url = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE tournament_id = $1`,
      [row.tournament_id, spec.title, spec.description, spec.coverUrl],
    );
    updatedTournaments.push({
      tournamentId: row.tournament_id,
      title: spec.title,
    });
  }

  await client.query('COMMIT');
  console.log(
    JSON.stringify(
      {
        hostUserId,
        email: HOST_EMAIL,
        updatedGroups,
        updatedTournaments,
      },
      null,
      2,
    ),
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
