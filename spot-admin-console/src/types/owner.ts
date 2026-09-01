export type SportType = 'Football' | 'Badminton'
export type FootballVariant = 'FIVE_A_SIDE' | 'SEVEN_A_SIDE'
export type FieldStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CHECKED_IN'
  | 'NO_SHOW'
  | 'COMPLETED'
  | 'CANCELLED'
export type SlotState = 'AVAILABLE' | 'BOOKED' | 'UNPAID' | 'MAINTENANCE'

export interface Venue {
  venueId: number
  name: string
  address: string
  amenities: string | null
  openingHours: string | null
  closingHours: string | null
  latitude?: number | null
  longitude?: number | null
  avgRating: number
  ratingCount: number
  fieldCount?: number
  activeFieldCount?: number
  maintenanceFieldCount?: number
}

export interface VenueImage {
  imageId: number
  venueId: number
  imageUrl: string
  displayOrder: number
}

export interface Field {
  fieldId: number
  venueId: number
  name: string
  sportType: SportType
  footballVariant: FootballVariant | null
  pricePerHour: number
  peakPricePerHour: number
  offPeakPricePerHour: number
  capacity: number
  status: FieldStatus
  maintenanceNote: string | null
  isAvailableNow: boolean
  images: FieldImage[]
}

export interface FieldImage {
  imageId: number
  fieldId: number
  imageUrl: string
  displayOrder: number
}

export interface ScheduleBooking {
  bookingId: number
  fieldId: number
  bookingDate: string
  status: BookingStatus
  startsAt: string
  endsAt: string
  totalAmount: number | null
  customerName: string | null
  customerPhone: string | null
}

export interface ScheduleSlot {
  startTime: string
  endTime: string
  state: SlotState
  bookingId?: number
  customerName?: string | null
  totalAmount?: number | null
}

export interface ScheduleField {
  fieldId: number
  name: string
  sportType: SportType
  status: FieldStatus
  slots: ScheduleSlot[]
}

export interface Schedule {
  venueId: number
  date: string
  fields: ScheduleField[]
}

export interface RevenuePoint {
  period: string
  revenue: number
  bookingCount: number
}

export interface RevenueBySport {
  sportType: SportType
  revenue: number
  bookingCount: number
}

export interface RevenueSummary {
  totalRevenue: number
  bySport: RevenueBySport[]
}

export interface Review {
  reviewId: number
  venueId: number
  venueName: string
  playerName: string | null
  rating: number
  reviewText: string | null
  createdAt: string
  hasReply: boolean
  replyText: string | null
  replyCreatedAt: string | null
}

export interface ActivityEvent {
  type: 'BOOKING_CREATED' | 'REVIEW_CREATED'
  occurredAt: string
  referenceId: number
  title: string
  venueName: string
  status?: BookingStatus
  rating?: number
}

export interface FacilityCard {
  fieldId: number
  venueId: number
  venueName: string
  fieldName: string
  sportType: SportType
  status: FieldStatus
  isAvailableNow: boolean
}

export interface DashboardSummary {
  kpis: {
    monthlyRevenue: { amount: number; currency: string; period: { from: string; to: string } }
    occupancyRate: { percent: number; bookedHours: number; availableHours: number }
    pendingBookings: { count: number; urgentCount: number }
    newReviews: { count: number }
  }
  bookingTrends: { points: { dayOfWeek: number; label: string; bookingCount: number }[] }
  recentActivities: ActivityEvent[]
  facilityCards: FacilityCard[]
}
