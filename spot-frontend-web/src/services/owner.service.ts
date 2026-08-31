import apiClient from './api.client'
import type { PaginatedResponse } from '@/types/admin'
import type {
  CreateFieldPayload,
  CreateVenuePayload,
  DashboardQueryParams,
  DashboardSummaryResponse,
  ListOwnerReviewsParams,
  OwnerField,
  OwnerReviewDetail,
  OwnerReviewListItem,
  OwnerVenueDetail,
  OwnerVenueImage,
  OwnerVenueSummary,
  PatchFieldPayload,
  PatchVenuePayload,
  ReplaceVenueImagesPayload,
  ReplyReviewPayload,
  ReplyReviewResponse,
  RevenuePeriodParams,
  RevenueSummaryResponse,
  RevenueTimeseriesParams,
  RevenueTimeseriesResponse,
} from '@/types/owner'

export async function getDashboardSummary(
  params: DashboardQueryParams
): Promise<DashboardSummaryResponse> {
  const { data } = await apiClient.get('/owner/dashboard/summary', { params })
  return data
}

export async function getRevenueSummary(
  params: RevenuePeriodParams
): Promise<RevenueSummaryResponse> {
  const { data } = await apiClient.get('/owner/revenue/summary', { params })
  return data
}

export async function getRevenueTimeseries(
  params: RevenueTimeseriesParams
): Promise<RevenueTimeseriesResponse> {
  const { data } = await apiClient.get('/owner/revenue/timeseries', { params })
  return data
}

export async function exportRevenueCsv(
  params: RevenuePeriodParams
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get('/owner/revenue/export', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? `spot-revenue-${params.from}-${params.to}.csv`
  return { blob: response.data, filename }
}

export async function listReviews(
  params: ListOwnerReviewsParams
): Promise<PaginatedResponse<OwnerReviewListItem>> {
  const { data } = await apiClient.get('/owner/reviews', { params })
  return data
}

export async function getReview(reviewId: number): Promise<{ review: OwnerReviewDetail }> {
  const { data } = await apiClient.get(`/owner/reviews/${reviewId}`)
  return data
}

export async function replyToReview(
  reviewId: number,
  payload: ReplyReviewPayload
): Promise<ReplyReviewResponse> {
  const { data } = await apiClient.post(`/owner/reviews/${reviewId}/reply`, payload)
  return data
}

export async function listVenues(): Promise<{ items: OwnerVenueSummary[] }> {
  const { data } = await apiClient.get('/owner/facilities/venues')
  return data
}

export async function createVenue(
  payload: CreateVenuePayload
): Promise<{ message: string; venue: OwnerVenueDetail }> {
  const { data } = await apiClient.post('/owner/facilities/venues', payload)
  return data
}

export async function getVenue(
  venueId: number
): Promise<{ venue: OwnerVenueDetail; fields: OwnerField[]; images: OwnerVenueImage[] }> {
  const { data } = await apiClient.get(`/owner/facilities/venues/${venueId}`)
  return data
}

export async function patchVenue(
  venueId: number,
  payload: PatchVenuePayload
): Promise<{ message: string; venue: OwnerVenueDetail }> {
  const { data } = await apiClient.patch(`/owner/facilities/venues/${venueId}`, payload)
  return data
}

export async function createField(
  venueId: number,
  payload: CreateFieldPayload
): Promise<{ message: string; field: OwnerField }> {
  const { data } = await apiClient.post(`/owner/facilities/venues/${venueId}/fields`, payload)
  return data
}

export async function patchField(
  venueId: number,
  fieldId: number,
  payload: PatchFieldPayload
): Promise<{ message: string; field: OwnerField }> {
  const { data } = await apiClient.patch(`/owner/facilities/venues/${venueId}/fields/${fieldId}`, payload)
  return data
}

export async function deleteField(venueId: number, fieldId: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`/owner/facilities/venues/${venueId}/fields/${fieldId}`)
  return data
}

export async function replaceVenueImages(
  venueId: number,
  payload: ReplaceVenueImagesPayload
): Promise<{ message: string; images: OwnerVenueImage[] }> {
  const { data } = await apiClient.put(`/owner/facilities/venues/${venueId}/images`, payload)
  return data
}
