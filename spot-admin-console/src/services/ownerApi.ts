import axios from 'axios'
import { useAuthStore } from '../state/authStore'
import type {
  Venue,
  Field,
  Schedule,
  ScheduleBooking,
  RevenueSummary,
  RevenuePoint,
  Review,
  DashboardSummary,
  FieldStatus,
  SportType,
} from '../types/owner'

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

export const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

// --- Auth ---

export async function login(email: string, password: string) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data as { accessToken: string; user: { userId: string; email: string; fullName: string; role: string; status: string } }
}

// --- Venues / facilities (Story 3, and used by Foundational venue load) ---

export async function listOwnerVenues() {
  const { data } = await apiClient.get('/owner/facilities/venues')
  return data.items as Venue[]
}

export async function getVenueDetail(venueId: number) {
  const { data } = await apiClient.get(`/owner/facilities/venues/${venueId}`)
  return data as { venue: Venue; fields: Field[] }
}

export async function createVenue(input: {
  name: string
  address: string
  amenities?: string
  openingHours?: string
  closingHours?: string
}) {
  const { data } = await apiClient.post('/owner/facilities/venues', input)
  return data.venue as Venue
}

export async function patchVenue(venueId: number, input: Partial<{
  name: string
  address: string
  amenities: string
  openingHours: string
  closingHours: string
}>) {
  const { data } = await apiClient.patch(`/owner/facilities/venues/${venueId}`, input)
  return data.venue as Venue
}

export async function createField(venueId: number, input: {
  name: string
  sportType: SportType
  capacity?: number
  status?: FieldStatus
  pricePerHour: number
  peakPricePerHour?: number
  offPeakPricePerHour?: number
}) {
  const { data } = await apiClient.post(`/owner/facilities/venues/${venueId}/fields`, input)
  return data.field as Field
}

export async function patchField(
  venueId: number,
  fieldId: number,
  input: Partial<{
    name: string
    status: FieldStatus
    pricePerHour: number
    peakPricePerHour: number
    offPeakPricePerHour: number
    maintenanceNote: string
  }>,
) {
  const { data } = await apiClient.patch(
    `/owner/facilities/venues/${venueId}/fields/${fieldId}`,
    input,
  )
  return data.field as Field
}

export async function deleteField(venueId: number, fieldId: number) {
  await apiClient.delete(`/owner/facilities/venues/${venueId}/fields/${fieldId}`)
}

// --- Dashboard (Story 2) ---

export async function getDashboardSummary(params: { venueId?: number } = {}) {
  const { data } = await apiClient.get('/owner/dashboard/summary', { params })
  return data as DashboardSummary
}

// --- Schedule (Story 1) ---

export async function getSchedule(params: { venueId: number; date: string; sport?: SportType }) {
  const { data } = await apiClient.get('/owner/schedule', { params })
  return data as Schedule
}

export async function createManualBooking(input: {
  fieldId: number
  bookingDate: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone?: string
  totalAmount: number
  markPaid?: boolean
}) {
  const { data } = await apiClient.post('/owner/schedule/bookings', input)
  return data.booking as ScheduleBooking
}

export async function cancelBooking(bookingId: number) {
  const { data } = await apiClient.post(`/owner/schedule/bookings/${bookingId}/cancel`)
  return data.booking as ScheduleBooking
}

// --- Revenue & payouts (Story 4) ---

export async function getRevenueSummary(params: { from: string; to: string; venueId?: number }) {
  const { data } = await apiClient.get('/owner/revenue/summary', { params })
  return data as RevenueSummary
}

export async function getRevenueTimeseries(params: {
  from: string
  to: string
  granularity: 'week' | 'month'
  venueId?: number
}) {
  const { data } = await apiClient.get('/owner/revenue/timeseries', { params })
  return data as { points: RevenuePoint[] }
}

// --- Reviews (Story 5) ---

export async function listReviews(params: {
  venueId?: number
  hasReply?: boolean
  limit?: number
  offset?: number
} = {}) {
  const { data } = await apiClient.get('/owner/reviews', { params })
  return data as { items: Review[] }
}

export async function getReview(reviewId: number) {
  const { data } = await apiClient.get(`/owner/reviews/${reviewId}`)
  return data as { review: Review }
}

export async function replyToReview(reviewId: number, replyText: string) {
  const { data } = await apiClient.post(`/owner/reviews/${reviewId}/reply`, { replyText })
  return data
}
