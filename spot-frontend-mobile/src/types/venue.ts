import { ImageSourcePropType } from 'react-native';

// Common fields shared by every venue card variant (Home, Booking list,
// Booking map popup) — each variant extends this with its own extra fields.
export type VenueBase = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  distanceLabel: string;
};
