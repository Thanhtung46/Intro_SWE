export type SportType = 'Football' | 'Badminton'
export type RevenueGranularity = 'week' | 'month'

export interface DateRange {
  from: string
  to: string
}

export interface DashboardQueryParams {
  month?: string
  venueId?: number
  trendsWeeks?: number
  recentLimit?: number
}

export interface DashboardKpis {
  monthlyRevenue: { amount: number; currency: string; period: { month: string; from: string; to: string } }
  occupancyRate: {
    percent: number
    bookedHours: number
    availableHours: number
    period: { month: string; from: string; to: string }
  }
  pendingBookings: { count: number; urgentCount: number }
  newReviews: { count: number; period: { month: string; from: string; to: string } }
}

export interface BookingTrendPoint {
  dayOfWeek: number
  label: string
  bookingCount: number
}

interface DashboardActivityBase {
  occurredAt: string
  referenceId: number
  title: string
  venueName: string
}

export interface DashboardActivityBooking extends DashboardActivityBase {
  type: 'BOOKING_CREATED'
  status: string
}

export interface DashboardActivityReview extends DashboardActivityBase {
  type: 'REVIEW_CREATED'
  rating: number
}

export type DashboardActivity = DashboardActivityBooking | DashboardActivityReview

export interface FacilityCard {
  fieldId: number
  venueId: number
  venueName: string
  fieldName: string
  sportType: string
  status: string
  isAvailableNow: boolean
}

export interface DashboardSummaryResponse {
  kpis: DashboardKpis
  bookingTrends: { period: DateRange; points: BookingTrendPoint[] }
  recentActivities: DashboardActivity[]
  facilityCards: FacilityCard[]
}

export interface RevenuePeriodParams {
  from: string
  to: string
  sport?: SportType
  venueId?: number
}

export interface RevenueTimeseriesParams extends RevenuePeriodParams {
  granularity?: RevenueGranularity
}

export interface RevenueBySport {
  sportType: string
  revenue: number
  bookingCount: number
}

export interface RevenueSummaryResponse {
  totalRevenue: number
  currency: string
  revenueSource: string
  bySport: RevenueBySport[]
  period: DateRange
  source: 'cache' | 'db'
}

export interface RevenueTimeseriesPoint {
  period: string
  revenue: number
  bookingCount: number
}

export interface RevenueTimeseriesResponse {
  granularity: RevenueGranularity
  points: RevenueTimeseriesPoint[]
  period: DateRange
  source: 'cache' | 'db'
}

export interface ListOwnerReviewsParams {
  venueId?: number
  rating?: number
  hasReply?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface OwnerReviewListItem {
  reviewId: number
  venueId: number
  venueName: string
  bookingId: number
  playerId: number
  playerName: string | null
  rating: number
  reviewText: string | null
  createdAt: string
  hasReply: boolean
  replyText: string | null
  replyCreatedAt: string | null
}

export interface OwnerReviewDetail {
  reviewId: number
  venueId: number
  venueName: string
  bookingId: number
  bookingDate: string
  fieldName: string
  playerId: number
  playerName: string | null
  rating: number
  reviewText: string | null
  createdAt: string
  reply: { replyId: number; replyText: string; createdAt: string } | null
}

export interface ReplyReviewPayload {
  replyText: string
}

export interface ReplyReviewResponse {
  review: {
    reviewId: number
    bookingId: number
    venueId: number
    playerId: number
    rating: number
    reviewText: string | null
    createdAt: string
    reply: { replyId: number; reviewId: number; ownerId: number; replyText: string; createdAt: string } | null
  }
  reply: { replyId: number; reviewId: number; ownerId: number; replyText: string; createdAt: string }
}

export type FieldStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'

export interface OwnerVenueSummary {
  venueId: number
  name: string
  address: string
  fieldCount: number
  activeFieldCount: number
  maintenanceFieldCount: number
  avgRating: number
  ratingCount: number
}

export interface OwnerVenueDetail {
  venueId: number
  name: string
  address: string
  amenities: string | null
  openingHours: string | null
  closingHours: string | null
  latitude: number | null
  longitude: number | null
  avgRating: number
  ratingCount: number
  createdAt: string
  updatedAt: string
}

export interface OwnerField {
  fieldId: number
  venueId: number
  name: string
  sportType: string
  pricePerHour: number
  peakPricePerHour: number
  offPeakPricePerHour: number
  capacity: number
  status: FieldStatus
  maintenanceNote: string | null
  isAvailableNow: boolean
}

export interface OwnerVenueImage {
  imageId: number
  venueId: number
  imageUrl: string
  displayOrder: number
}

export interface CreateVenuePayload {
  name: string
  address: string
  amenities?: string | null
  openingHours?: string | null
  closingHours?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type PatchVenuePayload = Partial<CreateVenuePayload>

export interface CreateFieldPayload {
  name: string
  sportType: SportType
  capacity?: number
  status?: FieldStatus
  maintenanceNote?: string | null
  pricePerHour: number
  peakPricePerHour?: number
  offPeakPricePerHour?: number
}

export type PatchFieldPayload = Partial<CreateFieldPayload>

export interface VenueImageInput {
  imageUrl: string
  displayOrder?: number
}

export interface ReplaceVenueImagesPayload {
  images: VenueImageInput[]
}

export interface OwnerNotification {
  notificationId: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  channel: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface ListNotificationsParams {
  limit?: number
  beforeId?: number
  unreadOnly?: boolean
}
