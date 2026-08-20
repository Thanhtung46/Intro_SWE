import { colors } from './colors';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  white: string;
  error: string;

  // --- Đợt 2 (dark-mode-appshell-home) — thêm mới, KHÔNG đụng 10 field trên ---
  // Nguồn Figma dark đợt này: fileKey ZTpFWfkdcEpHH4xJaKaBxT, 3 frame Phúc gửi
  // — Home dark node 198:2406 ("FootballDashboardDark" 198:2407), Home+ProfileMenu
  // dark node 198:2762, Home+NotificationMenu dark node 199:4190
  // ("NotificationsDark" 199:4193) — cùng palette "Aura Sports: Elite Dark" đã
  // dùng cho SettingsDark, đọc qua get_design_context/get_variable_defs.

  /** Nền toàn màn Home — KHÁC `background` (dùng cho Settings/formScreenBackground),
   * light giữ nguyên `colors.screenBackground` (#F8F9FF). Dark trùng hex với
   * `background` (#0C1324) — trùng hợp thật từ Figma, vẫn tách field riêng vì 2
   * field có ý nghĩa/light-value khác nhau. */
  screenBackgroundAlt: string;
  /** Viền header/bottom-nav dùng chung (AppShell/BottomNav) — node 198:2652
   * (border-b) / 198:2683 (border-t). Dark trùng hex với `divider` nhưng tách
   * field vì light khác (`colors.cardBorder` vs `colors.border`). */
  chromeBorder: string;
  /** Nền các nút tròn header (AI/chuông/avatar) — node 198:2664/198:2669/198:2676. */
  glassButtonBg: string;
  /** Nền thanh bottom-nav (khác glassButtonBg — node 198:2682 dùng alpha khác). */
  glassBarBg: string;
  /** Viền ring quanh nút tròn header — node 198:2665/198:2670/198:2681. */
  glassRingBorder: string;
  /** Nền pill tab đang active trong BottomNav — node 198:2684
   * (biến "primary-container"). Light giữ nguyên `BottomNavItem`'s ACTIVE_BG
   * cũ (#2170E4) — 1 trong 3 mã xanh khác nhau đã tồn tại sẵn trong app,
   * KHÔNG gộp với `primary`. */
  activeTabBg: string;
  /** Chữ/icon tab KHÔNG active trong BottomNav — light giữ nguyên
   * `BottomNavItem`'s INACTIVE_TEXT cũ (#334155). */
  inactiveTabText: string;
  /** Chữ nhấn nhá "link" (logo SPOT, "Explore All", "AI Assistant") — biến
   * Figma "primary" (#adc6ff, KHÁC "primary-container" #4d8eff đã map vào
   * field `primary` ở trên từ đợt Settings) — node 198:2660/198:2558/198:3153.
   * Light giữ nguyên `colors.primaryDark` (các chữ này đang dùng màu đó). */
  accentText: string;

  /** Nền card ProfileMenu/NotificationMenu — node 198:3079 (0.95) /
   * 199:4396 (0.96, coi là cùng 1 giá trị, sai số làm tròn giữa 2 mockup).
   * Light giữ nguyên `colors.white`. Viền dùng lại `surfaceBorder` (khớp
   * đúng rgba(66,71,84,0.5) ở cả 2 node). */
  menuSurface: string;
  /** Dải nền riêng cho hàng avatar+tên+email trong ProfileMenu — node
   * 198:3081. Light = 'transparent' (ProfileMenu hiện KHÔNG có dải nền
   * riêng ở đây) nên không đổi gì khi ở light mode. */
  menuHeaderBg: string;
  /** Viền dưới cùng của dải header trong ProfileMenu/NotificationMenu —
   * node 198:3082 / 199:4397. Light = 'transparent' (giữ đúng hiện trạng
   * không có viền này ở light). */
  menuHeaderBorder: string;
  /** Nền panel lồng bên trong menu (dropdown Language/Appearance xổ xuống
   * trong ProfileMenu) — light giữ nguyên `colors.screenBackground` (giá
   * trị gốc trước đợt này). Dark KHÔNG có bằng chứng trực tiếp (Figma
   * không vẽ trạng thái mở dropdown), dùng lại giá trị dark của
   * `menuHeaderBg` (rgba(21,27,45,0.8), node 198:3081) làm giá trị đại
   * diện hợp lý cho 1 panel lồng cùng tông. */
  menuNestedBg: string;

  /** Nền "kính mờ" cho quick-action card / upcoming-match card / VenueCard
   * trên Home — node 198:2480/198:2495 (quick action) và 198:2561/198:2606
   * (VenueCard), cả 2 cùng 1 giá trị. Light giữ nguyên `colors.glassBackground`. */
  glassCardBg: string;
  /** Nền outer wrapper thanh tìm kiếm Home — node 198:2416. Light giữ
   * nguyên `colors.cardBorder` (đang dùng làm nền outer, không phải viền). */
  searchOuterBg: string;
  /** Nền inner input thanh tìm kiếm Home — node 198:2419 (khác alpha với
   * `glassCardBg` dù cùng RGB gốc). Light giữ nguyên `colors.glassBackground`. */
  searchInnerBg: string;

  /** Icon "Book Field" (nền tint xanh) — node 198:2486 (nền) + SVG fill thật
   * (#4D8EFF, đã tải icon xuống kiểm tra trực tiếp, không đoán). Light giữ
   * nguyên nền `rgba(37, 99, 235, 0.2)`. */
  quickActionPrimaryBg: string;
  /** Chữ/icon "Book Field" — light giữ nguyên `colors.primary` (#2563EB). */
  quickActionPrimaryIcon: string;
  /** Icon "Find Match" (nền tint xanh) — node 198:2501, dark TRÙNG giá trị
   * với quickActionPrimaryBg (Figma hợp nhất 2 màu xanh light thành 1 màu
   * dark duy nhất — xác nhận thật, không phải tự gộp). Light giữ nguyên
   * `rgba(33, 112, 228, 0.2)`. */
  quickActionSecondaryBg: string;
  /** Chữ/icon "Find Match" — light giữ nguyên `'#2170E4'`. */
  quickActionSecondaryIcon: string;

  /** Overlay phủ lên ảnh "Upcoming Match" — light là `rgba(255,255,255,0.55)`
   * phẳng (code hiện tại dùng 1 lớp phủ phẳng, không phải gradient). Dark:
   * Figma vẽ gradient 3 điểm dừng (node 198:2517, từ rgba(12,19,36,0.95) đáy
   * đến rgba(12,19,36,0.2) đỉnh) — GIÁ TRỊ NÀY LÀ SUY DIỄN có căn cứ (làm
   * phẳng thành 1 mã đại diện `rgba(12,19,36,0.75)` để khớp cấu trúc code
   * phẳng hiện tại), không phải đọc pixel trực tiếp 1-1 như các field khác. */
  upcomingOverlayBg: string;
  /** Nền pill "View Schedule" — node 198:2526. Light giữ nguyên
   * `rgba(255, 255, 255, 0.8)` (hiện không có viền ở light). */
  scheduleAccentBg: string;
  /** Viền pill "View Schedule" — dark node 198:2526. Light = 'transparent'
   * (giữ đúng hiện trạng không viền). */
  scheduleAccentBorder: string;
  /** Chữ "View Schedule" — biến Figma "secondary" (vàng gold, node 198:2529),
   * KHÁC accentText. Light giữ nguyên `colors.primaryDark`. */
  accentGold: string;

  /** Chữ phụ tông thứ 3 (biến Figma "on-surface-variant", #C2C6D6) — dùng
   * cho địa điểm "Football Field A @ VietNet Center" (node 198:2545) và nội
   * dung notification item (node 199:4417/199:4435). Light giữ nguyên
   * `colors.bodyText`. */
  textSecondaryAlt: string;

  /** Nền chip nổi trên ảnh venue (distance/price badge) — node 198:2589/
   * 198:2600, ĐỔI màu ở dark (khác quy tắc "chip nổi trên ảnh giữ nguyên"
   * áp dụng cho carousel dots — đã đối chiếu Figma xác nhận rõ ràng có đổi,
   * không suy đoán). Light giữ nguyên `rgba(255, 255, 255, 0.9)`. */
  photoChipBg: string;

  /** Nền icon loại SYSTEM trong NotificationMenu — node 199:4457. Light
   * giữ nguyên `colors.border`. */
  systemIconBg: string;
  /** Dải nền nhấn cho item CHƯA đọc trong NotificationMenu — node 199:4404/
   * 199:4423. Light = 'transparent' (item hiện không có nền riêng ở light,
   * chỉ có chấm tròn nhỏ báo chưa đọc). */
  unreadItemTint: string;

  /** Badge số thông báo trên icon chuông — ĐÃ có sẵn 2 mã one-off
   * (#D2B306/#FFEDE6, xem AppShell.tsx) từ vé fix-notifications-scroll-
   * unread-badge, ghi rõ "không phải token app". Node dark tương ứng
   * (198:2675 ở Home, 199:4359 ở NotificationMenu) cho giá trị RÕ RÀNG khác
   * — biến "secondary" (#FFE083) + viền biến "surface" (#0C1324, thay cho
   * viền trắng ở light) — nên đổi theo bằng chứng thật này, đúng điều kiện
   * "trừ khi Figma dark cho thấy rõ giá trị khác" trong prompt. */
  /** Nền vòng tròn avatar-chữ-cái-đầu trong ProfileMenu — KHÔNG có bằng
   * chứng trực tiếp (mockup Figma dùng ảnh avatar thật, không phải chữ cái
   * đầu), suy diễn từ mẫu "vòng tròn tint xanh nhạt" lặp lại nhiều nơi
   * khác trong palette này (quick-action icon 0.15, notification-button
   * active 0.2) — chọn 0.2 làm giá trị đại diện. Light giữ nguyên
   * `colors.primarySoft`. */
  avatarCircleBg: string;
  badgeBg: string;
  badgeBorder: string;
  /** Chữ số trong badge — light giữ nguyên one-off cũ (#FFEDE6). Dark KHÔNG
   * có bằng chứng trực tiếp từ Figma (không mockup nào vẽ badge kèm số) nên
   * đây là giá trị suy diễn có căn cứ: dùng lại `background` (#0C1324) —
   * chữ tối trên nền vàng nhạt `badgeBg` để đọc được, theo đúng mẫu "chữ
   * tối trên chip sáng" Figma dùng lặp lại nhiều chỗ khác trong palette này. */
  badgeText: string;

  // --- Fix light-color-drift (đợt Dark Mode 2 lỡ trỏ nhầm field) ---
  /** Chữ tiêu đề đậm trên Home (quick-action label, "Tonight, 8:00 PM",
   * "Upcoming Match", "Recommended Venues") — trước đợt Dark Mode 2 là hằng
   * số cục bộ `HEADING_TEXT = '#020617'`, bị đổi nhầm khi thêm theme. Light
   * khôi phục đúng '#020617'. Dark = tái dùng đúng giá trị dark hiện tại
   * của `textPrimary` (đã đúng, không đổi). */
  homeHeadingText: string;
  /** Chữ địa điểm trong Upcoming Match ("Football Field A @ VietNet
   * Center") — cũng từng dùng `HEADING_TEXT` ('#020617') ở light, KHÔNG
   * phải `colors.bodyText` như bản sửa nhầm. Dark = tái dùng đúng giá trị
   * dark hiện tại của `textSecondaryAlt` (node 198:2545, đã đúng, không đổi). */
  homeLocationText: string;
  /** Placeholder ô tìm kiếm Home — light khôi phục đúng literal gốc
   * `rgba(51, 65, 85, 0.8)` (có alpha, không phải màu đặc). Dark tái dùng
   * giá trị dark hiện tại của `textSecondary`. */
  searchPlaceholderText: string;
  /** Chữ phụ trên VenueCard (distance badge trên ảnh) — light khôi phục
   * đúng `colors.headingText` gốc ('#0B1C30'), KHÔNG phải `colors.bodyText`.
   * Dark tái dùng đúng giá trị dark hiện tại của `textSecondaryAlt`. */
  venueCardMutedText: string;
  /** Chữ chính trên VenueCard (price badge, tên venue, rating) — light khôi
   * phục đúng `colors.headingText` gốc ('#0B1C30'), KHÔNG phải `colors.text`.
   * Dark tái dùng đúng giá trị dark hiện tại của `textPrimary`. */
  venueCardHeadingText: string;

  // --- Đợt 3 (dark-mode-round3-auth-flow) — thêm mới, KHÔNG đụng field trên ---
  // Nguồn màu dark: Pencil (KHÔNG phải Figma), file pencil-new.pen, 5 frame
  // dark Phúc gửi — Login (vr8ji/LoginDark rg57z), Register (y1I33/RegisterDark
  // M8r1kz), Forgot Password (SLEiS/ForgotPasswordDark L1VSbX), OTP
  // (keoc8/OtpDark N1NFIx), Choose role (Qq7sr/ChooseRoleDark SfXdv) — đọc qua
  // execute()/Get() (đọc fill/stroke thô, không qua get_design_context vì đây
  // là Pencil không phải Figma). Reset Password không có mockup dark riêng
  // (xác nhận trực tiếp: frame ZBW08 chỉ có 1 set fill sáng, không có
  // "...Dark" child như 5 frame kia) — tái dùng đúng bộ màu Forgot Password.

  /** Nền toàn màn cho Login/Register (đặc, KHÁC `background` — dùng cho
   * Forgot/Reset/OTP — và KHÁC `surface`). Cũng dùng cho thanh header đặc
   * (fade-in khi cuộn) của ChooseRoleScreen. Light: colors.white. Dark: đọc
   * trực tiếp từ LoginDark/RegisterDark/ChooseRoleDark (cả 3 đều
   * #0c1324ff) — trùng hex với `background`/`screenBackgroundAlt`, vẫn tách
   * field riêng vì ý nghĩa/light-value khác. */
  authScreenBg: string;
  /** Nền icon circle trên Forgot Password/Reset Password/OTP. Light:
   * colors.primarySoft. Dark: đọc từ LockIcon (ForgotPasswordDark, node
   * amKb1, #4d8eff26) và VerificationIcon (OtpDark, node u4PAU, #4d8eff26,
   * cùng giá trị). KHÔNG dùng chung với Login card (xem `loginCardBg`) —
   * Pencil cho 2 giá trị dark khác hẳn nhau (đã kiểm tra trực tiếp), tách
   * theo đúng điều kiện đã nêu trong prompt thay vì ép gộp. */
  tintedSurface: string;
  /** Nền card bọc form trên Login (KHÔNG dùng cho icon circle — xem
   * `tintedSurface` ở trên). Light: colors.primarySoft (giữ cùng field
   * light với tintedSurface vì code hiện tại dùng đúng 1 giá trị
   * colors.primarySoft cho cả 2 chỗ ở light mode). Dark: đọc từ LoginCard
   * (LoginDark, node f6I1NK, #191f31d9) — khác hẳn tintedSurface, xác nhận
   * qua Pencil trực tiếp (không suy đoán). */
  loginCardBg: string;
  /** Nền toàn màn ChooseRoleScreen. Light: colors.screenBackground
   * (#F8F9FF). Dark: đọc từ ChooseRoleDark (SfXdv, #0c1324ff) — trùng hex
   * với `background`, tách field riêng vì light khác. */
  roleScreenBg: string;
  /** Nền mặc định (chưa chọn) của RoleCard. Light: colors.cardBackground.
   * Dark: đọc từ RoleCard Wkgzi/j4uoYx/YKMZR (ChooseRoleDark, cả 3 card đều
   * #191f31d9, không có card nào ở trạng thái "đã chọn" trong mockup). */
  roleCardBg: string;
  /** Viền mặc định (chưa chọn) của RoleCard. Light: colors.cardBorder.
   * Dark: đọc từ viền RoleCard (node s4Zqw/VmuPN/E3vP2q, #42475480). */
  roleCardBorder: string;
  /** Nền RoleCard khi đã chọn. Light: colors.selectedBackground. Dark:
   * KHÔNG có bằng chứng trực tiếp — mockup Choose Role chỉ vẽ cả 3 role
   * card ở trạng thái CHƯA chọn (đã xác nhận trực tiếp qua Get(), không có
   * card nào selected). Phúc xác nhận dùng rgba(77, 142, 255, 0.15) — cùng
   * tông tint xanh đã lặp lại nhiều nơi khác trong palette dark này (icon
   * circle, quick-action tint...), theo đúng gợi ý "Recommended". */
  roleCardSelectedBg: string;
  /** Nền icon circle trong RoleCard (trạng thái chưa chọn). Light:
   * colors.iconBackground. Dark: đọc từ Container Wwpag/QC54O/EiEZP
   * (ChooseRoleDark, #4d8eff26) — trùng giá trị với `tintedSurface`, xác
   * nhận thật từ Pencil (không phải tự gộp nhầm). */
  roleIconBg: string;
  /** Nền nút Continue khi disabled (chưa chọn role). Light:
   * colors.primaryDisabled. Dark: KHÔNG có bằng chứng trực tiếp — mockup
   * Choose Role chỉ vẽ nút "Complete" ở trạng thái enabled (#4d8effff,
   * khớp field `primary`). Phúc xác nhận dùng rgba(77, 142, 255, 0.35) —
   * quy ước Material 3 "disabled container" (primary ở opacity giảm). */
  primaryDisabledBg: string;
  /** Chữ nút Continue khi disabled. Light: colors.primaryDisabledText.
   * Dark: KHÔNG có bằng chứng trực tiếp (cùng lý do trên). Phúc xác nhận
   * dùng rgba(220, 225, 251, 0.4) — textPrimary ở opacity giảm, quy ước
   * Material 3 "disabled on-container". */
  primaryDisabledText: string;
  /** Chữ lỗi trên ChooseRoleScreen — light dùng colors.error (#BA1A1A),
   * KHÁC field `error` đã có sẵn (đó là colors.formError, #DC2626) — giữ
   * tách riêng theo đúng yêu cầu prompt. Dark: KHÔNG có bằng chứng trực
   * tiếp (không màn dark nào trong bộ 5 mockup vẽ trạng thái lỗi). Phúc
   * xác nhận tái dùng #FFB4AB — cùng token Material 3 dark-error đã dùng
   * cho field `error`. */
  roleErrorText: string;
  /** Nền ô nhập liệu (FormField/PasswordField/OtpInput) — field MỚI phát
   * sinh ngoài kế hoạch 10 field ban đầu: Pencil cho thấy ô input dùng
   * #151b2dff (đặc, KHÁC hẳn `surface` #191f3199/rgba(25,31,49,0.85) — khác
   * cả RGB lẫn alpha) trên mọi màn (Login email/password, Register 6 ô,
   * Forgot Password email, OTP 6 ô — đọc nhất quán >10 lần, không phải 1
   * lần đọc mơ hồ). Light: colors.white (giữ đúng field FormField hiện
   * tại). */
  inputBg: string;

  // --- Đợt 4 (dark-mode-round4-profile) — thêm mới, KHÔNG đụng field trên ---
  // Nguồn màu dark: Pencil (pencil-new.pen), frame p6vCm5/MainProfileDark (CSsdJ).

  /** Nền 2 nút tròn/pill trên hero banner ProfileScreen (back + Edit) — đọc
   * từ Container zTCBG/RXFyT (MainProfileDark, cả 2 cùng #0c132466). Light:
   * 'rgba(255,255,255,0.2)'. */
  profileHeroGlassBg: string;
  /** Nền chip "Favorites" (KHÔNG active) VÀ pill tab "Hosted Matches"
   * (KHÔNG active) — đọc từ Container l5jU0o/MWGOA/w9iVS (Favorites) và
   * xkjlH/HiM1T (Hosted), cả 5 cùng #23293cb2. Light: colors.primarySoft.
   * Tách riêng khỏi `profileTabPillActiveBg`/`profileEmptyStateBg` — Pencil
   * cho 3 giá trị dark khác nhau cho 3 vị trí cùng 1 literal light, đã hỏi
   * Phúc, xác nhận tách field theo đúng bằng chứng thay vì ép về 1 giá trị. */
  profileChipTintBg: string;
  /** Nền pill tab "Hosted Matches" khi ACTIVE — đọc từ Container Ovgir
   * (MainProfileDark, #4d8eff26). Light: colors.primarySoft (giữ đúng field
   * light `tabPillActive.backgroundColor` hiện tại). */
  profileTabPillActiveBg: string;
  /** Nền `emptyState` dùng chung cho Favorites/Hosted Matches/Reviews — đọc
   * từ EmptyState fxoMq/K3wYyN/wH5Dh (MainProfileDark, cả 3 cùng #151b2d80).
   * Light: colors.primarySoft. */
  profileEmptyStateBg: string;
  /** Icon trái tim (Favorites) trong CardHeader — đọc từ Vector kvK7W
   * (MainProfileDark, #ec4899ff — TRÙNG hex với light `colors.pink`). */
  profileFavoritesIconColor: string;
  /** Nền badge tròn quanh icon trái tim — đọc từ Container xYXke
   * (MainProfileDark, #ec489926, ~15% alpha của icon color). Light:
   * colors.pinkSoft. */
  profileFavoritesIconBg: string;
  /** Icon sân (Hosted Matches) trong CardHeader — đọc từ Vector GvT55
   * (MainProfileDark, #f97316ff — TRÙNG hex với light `colors.orange`). */
  profileHostedIconColor: string;
  /** Nền badge tròn quanh icon sân — đọc từ Container ktsCt
   * (MainProfileDark, #f9731626, ~15% alpha). Light: colors.orangeSoft. */
  profileHostedIconBg: string;
  /** Icon ngôi sao (Reviews CardHeader của ProfileScreen VÀ rating stars của
   * ReviewModal, dùng chung 1 field) — đọc từ Vector F9d8HY (MainProfileDark,
   * #f59e0bff — TRÙNG hex với light `colors.amber`). */
  profileReviewsIconColor: string;
  /** Nền badge tròn quanh icon ngôi sao (chỉ ProfileScreen) — đọc từ
   * Container S2ySi (MainProfileDark, #f59e0b26, ~15% alpha). Light:
   * colors.amberSoft. */
  profileReviewsIconBg: string;

  // --- Đợt 4 (dark-mode-round4-schedule-venue) — thêm mới, KHÔNG đụng field trên ---
  // Nguồn màu dark: Pencil, frame bpH7Y/ViewScheduleDark (Sim7a).

  /** Chữ/icon trạng thái thành công — checkmark hoàn thành trận
   * (ScheduleScreen.completedHeader). Đọc từ Icon I52sYf (ViewScheduleDark,
   * #22c55eff). Light: colors.success (#16A34A). */
  successText: string;
  /** Nền track SportSegmentedToggle preset 'md' (Booking) — đọc từ Container
   * kc4N9 (BookingFieldHomePageDark, trDxV, #23293cff, ĐẶC chứ không alpha
   * như light). Light: 'rgba(211, 228, 254, 0.4)'. */
  sportToggleTrackBgTint: string;
  /** Nền track SportSegmentedToggle preset 'sm' (Home) — KHÔNG có mockup
   * riêng cho preset 'sm' trong Pencil (chỉ thấy 'md' ở Booking) — Phúc xác
   * nhận cứ suy ra hợp lý từ field cùng họ (`sportToggleTrackBgTint`), dùng
   * tông tương tự nhưng nhạt hơn để phân biệt 2 preset. SUY DIỄN, không đọc
   * Pencil trực tiếp. Light: 'rgba(224, 227, 229, 0.4)'. */
  sportToggleTrackBgSubtle: string;

  // --- Đợt 4 (dark-mode-round4-booking) — thêm mới, KHÔNG đụng field trên ---
  // Nguồn màu dark: Pencil, frame trDxV/BookingFieldHomePageDark (rnuh4) cho
  // các field có bằng chứng trực tiếp (đánh dấu rõ trong từng comment); các
  // field KHÔNG có mockup riêng (FiltersSheet/DatePickerModal/MapVenuePopup/
  // SelectPitchTimeModal/BookingMapScreen không xuất hiện trong frame này) —
  // Phúc xác nhận SUY DIỄN từ field cùng họ đã có bằng chứng thật, đánh dấu
  // "SUY DIỄN" rõ trong từng comment, không phải đọc Pencil trực tiếp.

  /** Nền outer thanh tìm kiếm BookingScreen — đọc từ Container y1Et79
   * (#0c1324eb). Light: 'rgba(248, 249, 255, 0.95)'. */
  bookingSearchBarBg: string;
  /** Viền mỏng dùng chung: BookingScreen searchBar border-bottom, FiltersSheet
   * header/footer border. Searchbar border-bottom đọc trực tiếp từ y1Et79
   * (#424754ff, ĐẶC); FiltersSheet SUY DIỄN cùng giá trị (không có mockup
   * riêng). Light: 'rgba(211, 228, 254, 0.5)'. */
  bookingSubtleBorder: string;
  /** Viền input/button vuông bo góc nhẹ — đọc trực tiếp từ searchInput
   * (YLsua) + mapButton (tJb1f) trong BookingScreen, cả 2 cùng #424754ff.
   * FiltersSheet/SelectPitchTimeModal dùng lại cùng field, SUY DIỄN (không
   * có mockup riêng). Light: '#E2E8F0'. */
  inputBorder: string;
  /** Chữ placeholder ô tìm kiếm BookingScreen — đọc trực tiếp từ text E8z7F
   * (#8c909fff). Light: '#94A3B8'. */
  bookingPlaceholderText: string;
  /** Nền kính mờ overlay BookingMapScreen (searchInput + chip sport) — KHÔNG
   * có mockup BookingMapScreen trong Pencil, SUY DIỄN từ `glassButtonBg`
   * (cùng họ "kính mờ nổi trên nội dung"). Light: 'rgba(255, 255, 255, 0.85)'. */
  mapGlassBg: string;
  /** Chữ placeholder ô tìm kiếm BookingMapScreen — SUY DIỄN, dùng lại cùng
   * giá trị `bookingPlaceholderText`. Light: 'rgba(67, 70, 85, 0.6)'. */
  mapGlassPlaceholderText: string;
  /** Vạch chia màu xám trung tính (BookingMapScreen zoomDivider,
   * SelectPitchTimeModal dragHandle) — SUY DIỄN từ tông `divider`/
   * `chromeBorder` (cùng RGB gốc #424754). Light: '#C3C6D7'. */
  neutralDivider: string;
  /** Nền chip/badge trắng mờ nổi trên ảnh (BookingVenueCard ratingBadge/
   * priceBadge, DatePickerModal modal) — đọc trực tiếp từ RatingBadge DSbzj
   * + PriceAndBookButton y9wpDq trong BookingScreen, cả 2 cùng #0c1324d9.
   * Light: 'rgba(255, 255, 255, 0.95)'. */
  venueCardChipBg: string;
  /** Viền modal DatePickerModal — KHÔNG có mockup modal riêng, SUY DIỄN từ
   * `surfaceBorder` (cùng vai trò viền panel nổi). Light:
   * 'rgba(255, 255, 255, 0.5)'. */
  modalBorder: string;
  /** Viền/chữ phụ nhạt dùng chung: DatePickerModal weekdayLabel,
   * FiltersSheet radioOuter/resetButton — SUY DIỄN từ tông `textSecondary`/
   * `textMuted` (#8C909F). Light: colors.outline ('#737686'). */
  outlineMuted: string;
  /** Chữ nhãn 2 đầu slider trong FiltersSheet — SUY DIỄN từ tông
   * `textSecondary` (#8C909F). Light: '#64748B'. */
  rangeLabelText: string;
  /** Nền khối lưới chọn giờ SelectPitchTimeModal — SUY DIỄN từ tông
   * `menuHeaderBg`/emptyState panel (rgba(21,27,45,0.5)). Light:
   * 'rgba(248, 250, 252, 0.5)'. */
  matrixBg: string;
  /** Chữ phụ trong lưới chọn giờ SelectPitchTimeModal — SUY DIỄN từ tông
   * `textSecondary` (#8C909F). Light: '#585F67'. */
  mutedCellText: string;
  /** Viền từng ô trong lưới giờ SelectPitchTimeModal — SUY DIỄN, tông xanh
   * primary nhạt hơn ở dark để còn thấy được trên nền tối (light chỉ 0.05
   * alpha xanh, gần như vô hình trên nền tối nên tăng nhẹ alpha). Light:
   * 'rgba(0, 74, 198, 0.05)'. */
  gridCellBorder: string;
  /** Vạch nhấn nhỏ dưới ô đã chọn trong lưới giờ — SUY DIỄN, giữ nguyên
   * cùng giá trị light vì đây là overlay trắng mờ TRÊN nền ô đã tô màu
   * primary (không phải nền màn hình), không cần đổi theo theme. Light:
   * 'rgba(255, 255, 255, 0.3)'. */
  selectedAccentOverlay: string;
  /** Nền nút xoá lựa chọn (thùng rác) SelectPitchTimeModal — SUY DIỄN từ
   * tông tint xanh `tintedSurface`/`quickActionPrimaryBg`
   * (rgba(77,142,255,0.15)). Light: '#D3E4FE'. */
  clearButtonBg: string;
}

export const lightTheme: ThemeColors = {
  background: colors.formScreenBackground,
  surface: colors.white,
  surfaceBorder: 'transparent',
  divider: colors.border,
  textPrimary: colors.text,
  textSecondary: colors.subtitle,
  textMuted: colors.placeholder,
  primary: colors.primaryDark,
  white: colors.white,
  error: colors.formError,

  screenBackgroundAlt: colors.screenBackground,
  chromeBorder: colors.cardBorder,
  glassButtonBg: 'rgba(255, 255, 255, 0.9)',
  glassBarBg: 'rgba(255, 255, 255, 0.9)',
  glassRingBorder: colors.ringBorder,
  activeTabBg: '#2170E4',
  inactiveTabText: '#334155',
  accentText: colors.primaryDark,

  menuSurface: colors.white,
  menuHeaderBg: 'transparent',
  menuHeaderBorder: 'transparent',
  menuNestedBg: colors.screenBackground,

  glassCardBg: colors.glassBackground,
  searchOuterBg: colors.cardBorder,
  searchInnerBg: colors.glassBackground,

  quickActionPrimaryBg: 'rgba(37, 99, 235, 0.2)',
  quickActionPrimaryIcon: colors.primary,
  quickActionSecondaryBg: 'rgba(33, 112, 228, 0.2)',
  quickActionSecondaryIcon: '#2170E4',

  upcomingOverlayBg: 'rgba(255, 255, 255, 0.55)',
  scheduleAccentBg: 'rgba(255, 255, 255, 0.8)',
  scheduleAccentBorder: 'transparent',
  accentGold: colors.primaryDark,

  textSecondaryAlt: colors.bodyText,

  photoChipBg: 'rgba(255, 255, 255, 0.9)',

  systemIconBg: colors.border,
  unreadItemTint: 'transparent',

  avatarCircleBg: colors.primarySoft,
  badgeBg: '#D2B306',
  badgeBorder: colors.white,
  badgeText: '#FFEDE6',

  homeHeadingText: '#020617',
  homeLocationText: '#020617',
  searchPlaceholderText: 'rgba(51, 65, 85, 0.8)',
  venueCardMutedText: '#0B1C30',
  venueCardHeadingText: '#0B1C30',

  authScreenBg: colors.white,
  tintedSurface: colors.primarySoft,
  loginCardBg: colors.primarySoft,
  roleScreenBg: colors.screenBackground,
  roleCardBg: colors.cardBackground,
  roleCardBorder: colors.cardBorder,
  roleCardSelectedBg: colors.selectedBackground,
  roleIconBg: colors.iconBackground,
  primaryDisabledBg: colors.primaryDisabled,
  primaryDisabledText: colors.primaryDisabledText,
  roleErrorText: colors.error,
  inputBg: colors.white,

  profileHeroGlassBg: 'rgba(255,255,255,0.2)',
  profileChipTintBg: colors.primarySoft,
  profileTabPillActiveBg: colors.primarySoft,
  profileEmptyStateBg: colors.primarySoft,
  profileFavoritesIconColor: colors.pink,
  profileFavoritesIconBg: colors.pinkSoft,
  profileHostedIconColor: colors.orange,
  profileHostedIconBg: colors.orangeSoft,
  profileReviewsIconColor: colors.amber,
  profileReviewsIconBg: colors.amberSoft,

  successText: colors.success,
  sportToggleTrackBgTint: 'rgba(211, 228, 254, 0.4)',
  sportToggleTrackBgSubtle: 'rgba(224, 227, 229, 0.4)',

  bookingSearchBarBg: 'rgba(248, 249, 255, 0.95)',
  bookingSubtleBorder: 'rgba(211, 228, 254, 0.5)',
  inputBorder: '#E2E8F0',
  bookingPlaceholderText: '#94A3B8',
  mapGlassBg: 'rgba(255, 255, 255, 0.85)',
  mapGlassPlaceholderText: 'rgba(67, 70, 85, 0.6)',
  neutralDivider: '#C3C6D7',
  venueCardChipBg: 'rgba(255, 255, 255, 0.95)',
  modalBorder: 'rgba(255, 255, 255, 0.5)',
  outlineMuted: colors.outline,
  rangeLabelText: '#64748B',
  matrixBg: 'rgba(248, 250, 252, 0.5)',
  mutedCellText: '#585F67',
  gridCellBorder: 'rgba(0, 74, 198, 0.05)',
  selectedAccentOverlay: 'rgba(255, 255, 255, 0.3)',
  clearButtonBg: '#D3E4FE',
};

// Lấy từ Figma "SettingsDark" (node 199:3786) qua Dev Mode MCP —
// Aura Sports: Elite Dark palette.
export const darkTheme: ThemeColors = {
  background: '#0C1324',
  surface: 'rgba(25, 31, 49, 0.85)',
  surfaceBorder: 'rgba(66, 71, 84, 0.5)',
  divider: 'rgba(66, 71, 84, 0.4)',
  textPrimary: '#DCE1FB',
  textSecondary: '#8C909F',
  textMuted: '#8C909F',
  primary: '#4D8EFF',
  white: '#FFFFFF',
  error: '#FFB4AB',

  // Đợt 2 — nguồn: node 198:2406 (Home), 198:2762 (Home+ProfileMenu),
  // 199:4190 (Home+NotificationMenu), fileKey ZTpFWfkdcEpHH4xJaKaBxT.
  screenBackgroundAlt: '#0C1324',
  chromeBorder: 'rgba(66, 71, 84, 0.4)',
  glassButtonBg: 'rgba(25, 31, 49, 0.8)',
  glassBarBg: 'rgba(12, 19, 36, 0.85)',
  glassRingBorder: 'rgba(77, 142, 255, 0.3)',
  activeTabBg: '#4D8EFF',
  inactiveTabText: '#8C909F',
  accentText: '#ADC6FF',

  menuSurface: 'rgba(12, 19, 36, 0.95)',
  menuHeaderBg: 'rgba(21, 27, 45, 0.8)',
  menuHeaderBorder: 'rgba(66, 71, 84, 0.4)',
  menuNestedBg: 'rgba(21, 27, 45, 0.8)',

  glassCardBg: 'rgba(25, 31, 49, 0.85)',
  searchOuterBg: 'rgba(21, 27, 45, 0.8)',
  searchInnerBg: 'rgba(25, 31, 49, 0.7)',

  quickActionPrimaryBg: 'rgba(77, 142, 255, 0.15)',
  quickActionPrimaryIcon: '#4D8EFF',
  quickActionSecondaryBg: 'rgba(77, 142, 255, 0.15)',
  quickActionSecondaryIcon: '#4D8EFF',

  // Suy diễn có căn cứ (làm phẳng gradient 198:2517) — xem comment interface.
  upcomingOverlayBg: 'rgba(12, 19, 36, 0.75)',
  scheduleAccentBg: 'rgba(255, 224, 131, 0.15)',
  scheduleAccentBorder: 'rgba(255, 224, 131, 0.3)',
  accentGold: '#FFE083',

  textSecondaryAlt: '#C2C6D6',

  photoChipBg: 'rgba(12, 19, 36, 0.8)',

  systemIconBg: 'rgba(35, 41, 60, 0.8)',
  unreadItemTint: 'rgba(77, 142, 255, 0.06)',

  avatarCircleBg: 'rgba(77, 142, 255, 0.2)',
  badgeBg: '#FFE083',
  badgeBorder: '#0C1324',
  badgeText: '#0C1324',

  homeHeadingText: '#DCE1FB',
  homeLocationText: '#C2C6D6',
  searchPlaceholderText: '#8C909F',
  venueCardMutedText: '#C2C6D6',
  venueCardHeadingText: '#DCE1FB',

  // Đợt 3 — nguồn Pencil pencil-new.pen, xem comment interface phía trên.
  authScreenBg: '#0C1324',
  tintedSurface: 'rgba(77, 142, 255, 0.15)',
  loginCardBg: 'rgba(25, 31, 49, 0.85)',
  roleScreenBg: '#0C1324',
  roleCardBg: 'rgba(25, 31, 49, 0.85)',
  roleCardBorder: 'rgba(66, 71, 84, 0.5)',
  // Không có bằng chứng Pencil trực tiếp (Phúc xác nhận dùng giá trị này) — xem comment interface.
  roleCardSelectedBg: 'rgba(77, 142, 255, 0.15)',
  roleIconBg: 'rgba(77, 142, 255, 0.15)',
  // Không có bằng chứng Pencil trực tiếp (Phúc xác nhận dùng giá trị này) — xem comment interface.
  primaryDisabledBg: 'rgba(77, 142, 255, 0.35)',
  primaryDisabledText: 'rgba(220, 225, 251, 0.4)',
  // Không có bằng chứng Pencil trực tiếp (Phúc xác nhận tái dùng field `error`) — xem comment interface.
  roleErrorText: '#FFB4AB',
  inputBg: '#151B2D',

  // Đợt 4 (profile) — nguồn Pencil, frame p6vCm5/MainProfileDark. Xem comment interface.
  profileHeroGlassBg: 'rgba(12, 19, 36, 0.4)',
  profileChipTintBg: 'rgba(35, 41, 60, 0.7)',
  profileTabPillActiveBg: 'rgba(77, 142, 255, 0.15)',
  profileEmptyStateBg: 'rgba(21, 27, 45, 0.5)',
  profileFavoritesIconColor: '#EC4899',
  profileFavoritesIconBg: 'rgba(236, 72, 153, 0.15)',
  profileHostedIconColor: '#F97316',
  profileHostedIconBg: 'rgba(249, 115, 22, 0.15)',
  profileReviewsIconColor: '#F59E0B',
  profileReviewsIconBg: 'rgba(245, 158, 11, 0.15)',

  // Đợt 4 (schedule-venue) — nguồn Pencil, frame bpH7Y/ViewScheduleDark.
  successText: '#22C55E',
  // sportToggleTrackBgTint đọc trực tiếp Pencil (trDxV/BookingFieldHomePageDark);
  // sportToggleTrackBgSubtle là SUY DIỄN — xem comment interface.
  sportToggleTrackBgTint: '#23293C',
  sportToggleTrackBgSubtle: 'rgba(35, 41, 60, 0.5)',

  // Đợt 4 (booking) — nguồn Pencil trDxV/BookingFieldHomePageDark cho field
  // có bằng chứng trực tiếp; còn lại SUY DIỄN (Phúc xác nhận) — xem comment interface.
  bookingSearchBarBg: 'rgba(12, 19, 36, 0.92)',
  bookingSubtleBorder: '#424754',
  inputBorder: '#424754',
  bookingPlaceholderText: '#8C909F',
  mapGlassBg: 'rgba(25, 31, 49, 0.8)',
  mapGlassPlaceholderText: '#8C909F',
  neutralDivider: 'rgba(66, 71, 84, 0.6)',
  venueCardChipBg: 'rgba(12, 19, 36, 0.85)',
  modalBorder: 'rgba(66, 71, 84, 0.5)',
  outlineMuted: '#8C909F',
  rangeLabelText: '#8C909F',
  matrixBg: 'rgba(21, 27, 45, 0.5)',
  mutedCellText: '#8C909F',
  gridCellBorder: 'rgba(77, 142, 255, 0.08)',
  selectedAccentOverlay: 'rgba(255, 255, 255, 0.3)',
  clearButtonBg: 'rgba(77, 142, 255, 0.15)',
};
