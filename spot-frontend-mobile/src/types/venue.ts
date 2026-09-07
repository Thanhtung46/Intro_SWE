import { ImageSourcePropType } from 'react-native';

// Common fields shared by every venue card variant (Home, Booking list,
// Booking map popup) — each variant extends this with its own extra fields.
export type VenueBase = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  /** Bundled placeholder to swap to if `image` is a remote URI that fails
   * to load (e.g. an uploaded photo whose file no longer exists on disk) —
   * without this, a broken remote image renders as blank/white instead of
   * degrading gracefully. */
  fallbackImage: ImageSourcePropType;
  distanceLabel: string;
};
