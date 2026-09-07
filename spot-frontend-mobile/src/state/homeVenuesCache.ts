import { createStaleCache } from './createStaleCache';
import { PublicVenue } from '@/services/venueService';

/** Home tab's per-sport cover-image lookup pool, keyed by venueId → coverImageUrl (see HomeScreen.tsx). */
export const useHomeVenuesCache = createStaleCache<PublicVenue[]>();
