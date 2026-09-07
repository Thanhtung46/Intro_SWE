import { createStaleCache } from './createStaleCache';
import { BookingVenue } from '@/components/booking/BookingVenueCard';

/** Booking tab's venue list — keyed by nothing (single active query at a time, matching the screen's own single search/filter state). */
export const useBookingVenuesCache = createStaleCache<BookingVenue[]>();
