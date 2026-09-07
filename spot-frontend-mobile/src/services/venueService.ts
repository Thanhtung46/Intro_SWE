import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

export interface PublicVenue {
  venueId: number;
  name: string;
  address: string;
  amenities: string | null;
  openingHours: string | null;
  closingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  /** Lowest active price/hr for fields matching the requested `sport` — only
   * populated on the list endpoint (`listVenues`), not on detail. */
  priceFromPerHour: number | null;
  /** Distinct football court sizes at this venue for the requested `sport`
   * (e.g. ['FIVE_A_SIDE', 'SEVEN_A_SIDE']) — empty for badminton. */
  footballVariants: ('FIVE_A_SIDE' | 'SEVEN_A_SIDE')[];
  avgRating: number;
  ratingCount: number;
  distanceKm?: number | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  ownerPhone: string | null;
}

export interface PublicField {
  fieldId: number;
  venueId: number;
  name: string;
  sportType: string;
  footballVariant: 'FIVE_A_SIDE' | 'SEVEN_A_SIDE' | null;
  pricePerHour: number;
  capacity: number;
  status: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface PublicVenueImage {
  imageId: number;
  venueId: number;
  /** 'venue' = owner's venue-level photo, 'field' = a court's own photo —
   * imageId is only unique within its source, so combine both for React keys. */
  source: 'venue' | 'field';
  imageUrl: string;
  displayOrder: number;
}

export interface ListVenuesResult {
  success: boolean;
  venues?: PublicVenue[];
  message?: string;
}

export interface VenueDetailResult {
  success: boolean;
  venue?: PublicVenue;
  fields?: PublicField[];
  message?: string;
}

export interface FieldAvailabilityResult {
  success: boolean;
  fieldId?: number;
  date?: string;
  slots?: AvailabilitySlot[];
  message?: string;
}

export interface VenueImagesResult {
  success: boolean;
  images?: PublicVenueImage[];
  message?: string;
}

const client: AxiosInstance = axios.create();

function errorMessage(err: unknown): string {
  const error = err as AxiosError<{ message?: string }>;
  if (!error.response) {
    return 'Network error. Please check your connection and try again.';
  }
  return error.response.data?.message || 'Something went wrong. Please try again.';
}

/** GET /venues?sport=...(&location=|&lat=&long=&radiusKm=) — location is a
 * free-text search against venue name/address (mutually exclusive with
 * lat/long/radiusKm on the backend — "Use location or distance, not both"). */
export async function listVenues(
  sport: string,
  opts?: {
    location?: string;
    lat?: number;
    long?: number;
    radiusKm?: number;
    province?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    date?: string;
    timeFrom?: string;
    timeTo?: string;
  },
): Promise<ListVenuesResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params: Record<string, string | number> = { sport };
    if (opts?.location) params.location = opts.location;
    if (opts?.lat !== undefined && opts?.long !== undefined) {
      params.lat = opts.lat;
      params.long = opts.long;
      if (opts.radiusKm !== undefined) {
        params.radiusKm = opts.radiusKm;
      }
    }
    if (opts?.province !== undefined) params.province = opts.province;
    if (opts?.city !== undefined) params.city = opts.city;
    if (opts?.priceMin !== undefined) params.priceMin = opts.priceMin;
    if (opts?.priceMax !== undefined) params.priceMax = opts.priceMax;
    if (opts?.date !== undefined) params.date = opts.date;
    if (opts?.timeFrom !== undefined) params.timeFrom = opts.timeFrom;
    if (opts?.timeTo !== undefined) params.timeTo = opts.timeTo;
    const res = await client.get<{ venues: PublicVenue[] }>(`${API_URL}/venues`, {
      headers,
      params,
    });
    return { success: true, venues: res.data.venues };
  } catch (err) {
    return { success: false, message: errorMessage(err) };
  }
}

/** GET /venues/:venueId(?sport=...) — sport narrows fields to that sport only,
 * so a venue hosting both football and badminton courts doesn't let a player
 * booking from the football tab see/pick a badminton pitch, and vice versa. */
export async function getVenueDetail(venueId: number, sport?: string): Promise<VenueDetailResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ venue: PublicVenue; fields: PublicField[] }>(
      `${API_URL}/venues/${venueId}`,
      { headers, params: sport ? { sport } : undefined },
    );
    return { success: true, venue: res.data.venue, fields: res.data.fields };
  } catch (err) {
    return { success: false, message: errorMessage(err) };
  }
}

/** GET /venues/:venueId/fields/:fieldId/availability?date=... */
export async function getFieldAvailability(
  venueId: number,
  fieldId: number,
  date: string,
): Promise<FieldAvailabilityResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ fieldId: number; date: string; slots: AvailabilitySlot[] }>(
      `${API_URL}/venues/${venueId}/fields/${fieldId}/availability`,
      { headers, params: { date } },
    );
    return { success: true, fieldId: res.data.fieldId, date: res.data.date, slots: res.data.slots };
  } catch (err) {
    return { success: false, message: errorMessage(err) };
  }
}

/** GET /venues/:venueId/images */
export async function getVenueImages(venueId: number): Promise<VenueImagesResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ images: PublicVenueImage[] }>(
      `${API_URL}/venues/${venueId}/images`,
      { headers },
    );
    return { success: true, images: res.data.images };
  } catch (err) {
    return { success: false, message: errorMessage(err) };
  }
}
