import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { REFEREE_FEE_VND } from '@/constants/booking';
import { comingSoon } from '@/utils/comingSoon';
import { showAlert } from '@/utils/showAlert';
import { openVenueDirections } from '@/utils/directions';
import { ROUTES } from '@/constants/routes';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKey } from '@/i18n/translations';
import SelectPitchTimeModal, { Pitch } from '@/components/booking/SelectPitchTimeModal';
import AppMap, { AppMapMarker, Region } from '@/components/common/AppMap';
import ImageLightbox from '@/components/common/ImageLightbox';
import { getVenueDetail, getVenueImages, PublicField, PublicVenueImage } from '@/services/venueService';
import { getVenueRating, listVenueReviews, VenueReview } from '@/services/reviewService';

// Ho Chi Minh City center — same fallback BookingMapScreen uses when a venue
// has no pinned coords yet, so the map still renders instead of blank/text.
const DEFAULT_MAP_REGION: Region = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

type VenueDetail = {
  name: string;
  heroImage: ImageSourcePropType;
  address: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  hours: string;
  capacityLabel: string;
  latitude: number | null;
  longitude: number | null;
  schedule: { dateLabel: string; timeLabel: string; pitchLabel: string };
  extraService: { label: string; priceLabel: string };
  contact: { name: string; phone: string; avatarUrl: string | null };
  pitches: Pitch[];
  price: string;
  priceUnit: string;
};

// GET /venues/:venueId has no heroImage / schedule / extra-service / contact
// data (data-model.md PublicVenue) — this is static placeholder copy shared
// by every real venue, not per-venue fake data.
const VENUE_PLACEHOLDER_IMAGE = require('../../../assets/booking/venue-skyline-arena-action.jpg');
const DEFAULT_VENUE_EXTRAS = {
  heroImage: VENUE_PLACEHOLDER_IMAGE,
  verified: false,
  schedule: { dateLabel: 'No upcoming booking', timeLabel: '', pitchLabel: 'Pick a pitch below to book one' },
  extraService: { label: 'Hire a Referee', priceLabel: `+ ${formatVnd(REFEREE_FEE_VND)} VND` },
  contact: { name: 'Venue Management', phone: '', avatarUrl: null },
};

const EMPTY_VENUE_DETAIL: VenueDetail = {
  name: '',
  address: '',
  rating: 0,
  reviewCount: 0,
  hours: '— - —',
  capacityLabel: '0 Pitches',
  latitude: null,
  longitude: null,
  pitches: [],
  price: '—',
  priceUnit: 'VND / hr',
  ...DEFAULT_VENUE_EXTRAS,
};

function formatVnd(amount: number): string {
  return amount.toLocaleString('en-US');
}

const FOOTBALL_VARIANT_LABEL: Record<string, string> = {
  FIVE_A_SIDE: 'Sân 5',
  SEVEN_A_SIDE: 'Sân 7',
};

function fieldSportLabel(field: PublicField): string {
  const variantLabel = field.footballVariant ? FOOTBALL_VARIANT_LABEL[field.footballVariant] : null;
  return variantLabel ? `${field.sportType} · ${variantLabel}` : field.sportType;
}

/**
 * Parses "HH:MM - HH:MM" into [openHour, closeHour]; `null` when the venue
 * has no opening/closing hours set — booking must be disabled in that case,
 * not silently shown as open (the backend will reject every slot anyway).
 */
function parseHours(hours: string): [number, number] | null {
  const match = hours.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

type Tab = 'about' | 'pricing' | 'gallery' | 'reviews';

function getTabs(t: (key: TranslationKey) => string): { key: Tab; label: string }[] {
  return [
    { key: 'about', label: t('venueDetail.tabAbout') },
    { key: 'pricing', label: t('venueDetail.tabPricing') },
    { key: 'gallery', label: t('venueDetail.tabGallery') },
    { key: 'reviews', label: t('venueDetail.tabReviews') },
  ];
}

type Props = {
  venueId: string;
  /** Active sport tab the player came from (e.g. Booking screen) — when set,
   * scopes fields/pitches to that sport only, since one venue can host both
   * football and badminton courts and a player shouldn't be able to book
   * the wrong one. */
  sport?: string;
  /** Preselected date (YYYY-MM-DD) / start time (HH:mm) — set when handed
   * off from the AI assistant after a venue search (spec
   * 007-assistant-venue-search P3), so the player lands with the slot
   * they asked for already picked instead of a blank "today" view. */
  initialDate?: string;
  initialTimeFrom?: string;
  onBack: () => void;
};

/** Venue detail — Figma node 19:297 ("Booking field - Venue Detail"). */
export default function VenueDetailScreen({ venueId, sport, initialDate, initialTimeFrom, onBack }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const TABS = getTabs(t);
  const [venue, setVenue] = useState<VenueDetail>(EMPTY_VENUE_DETAIL);
  const [fields, setFields] = useState<PublicField[]>([]);
  const [reviewRating, setReviewRating] = useState<{ avgRating: number; ratingCount: number } | null>(null);
  const [reviewRatingError, setReviewRatingError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [images, setImages] = useState<PublicVenueImage[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [refereeHired, setRefereeHired] = useState(false);
  const [pitchTimeVisible, setPitchTimeVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const numericVenueId = Number(venueId);

  useEffect(() => {
    if (!Number.isInteger(numericVenueId)) return;
    setHeroImageFailed(false);
    setImagesLoading(true);
    getVenueDetail(numericVenueId, sport).then((result) => {
      if (!result.success || !result.venue) return;
      const apiVenue = result.venue;
      // Soft-deleted courts (owner "delete facility") stay INACTIVE, not
      // removed — hide them here so players can't select an unbookable court.
      const apiFields = (result.fields ?? []).filter((f) => f.status !== 'INACTIVE');
      const prices = apiFields.map((f) => f.pricePerHour);
      setFields(apiFields);
      setVenue({
        name: apiVenue.name,
        address: apiVenue.address,
        rating: apiVenue.avgRating,
        reviewCount: apiVenue.ratingCount,
        hours:
          apiVenue.openingHours && apiVenue.closingHours
            ? `${apiVenue.openingHours} - ${apiVenue.closingHours}`
            : '— - —',
        capacityLabel: `${apiFields.length} ${apiFields.length === 1 ? t('venueDetail.pitchSingular') : t('venueDetail.pitchPlural')}`,
        latitude: apiVenue.latitude,
        longitude: apiVenue.longitude,
        pitches: apiFields.map((f) => ({
          fieldId: f.fieldId,
          name: f.name,
          format: f.sportType,
          pricePerHour: f.pricePerHour,
        })),
        price: prices.length ? formatVnd(Math.min(...prices)) : '—',
        priceUnit: 'VND / hr',
        ...DEFAULT_VENUE_EXTRAS,
        contact: {
          name: apiVenue.ownerName ?? DEFAULT_VENUE_EXTRAS.contact.name,
          phone: apiVenue.ownerPhone ?? DEFAULT_VENUE_EXTRAS.contact.phone,
          avatarUrl: apiVenue.ownerAvatarUrl,
        },
      });
    });

    getVenueRating(numericVenueId).then((result) => {
      if (result.success && result.avgRating !== undefined && result.ratingCount !== undefined) {
        setReviewRating({ avgRating: result.avgRating, ratingCount: result.ratingCount });
        setReviewRatingError(null);
      } else {
        setReviewRating(null);
        setReviewRatingError(result.message ?? t('common.genericError'));
      }
    });

    listVenueReviews(numericVenueId).then((result) => {
      if (result.success) {
        setReviews(result.reviews ?? []);
        setReviewsError(null);
      } else {
        setReviews([]);
        setReviewsError(result.message ?? t('common.genericError'));
      }
    });

    getVenueImages(numericVenueId).then((result) => {
      if (result.success) {
        setImages(result.images ?? []);
        setImagesError(null);
      } else {
        setImages([]);
        setImagesError(result.message ?? t('common.genericError'));
      }
      setImagesLoading(false);
    });
  }, [numericVenueId, sport]);

  const parsedHours = parseHours(venue.hours);

  // Assistant hand-off (spec 007-assistant-venue-search P3): open the
  // slot picker automatically, already positioned at the requested
  // date/time, instead of making the player tap "Book Now" again after
  // the assistant already asked them to confirm this exact slot.
  useEffect(() => {
    if ((initialDate || initialTimeFrom) && parsedHours) {
      setPitchTimeVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, initialTimeFrom, Boolean(parsedHours)]);
  const hasCoords = venue.latitude != null && venue.longitude != null;
  const mapMarkers: AppMapMarker[] = hasCoords
    ? [{ id: 'venue', latitude: venue.latitude as number, longitude: venue.longitude as number, tintColor: colors.primaryDark, emoji: '📍' }]
    : [];
  const mapRegion: Region = hasCoords
    ? { ...DEFAULT_MAP_REGION, latitude: venue.latitude as number, longitude: venue.longitude as number, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_MAP_REGION;

  const openVenueMap = () => {
    openVenueDirections(router, {
      latitude: venue.latitude,
      longitude: venue.longitude,
      venueName: venue.name,
      venueAddress: venue.address,
    });
  };

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {imagesLoading ? (
            // Avoid flashing the generic stock photo before the venue's own
            // uploaded photo arrives — show a neutral placeholder instead
            // and swap in the real image (or the stock fallback) once the
            // photo fetch has actually settled.
            <View style={[styles.heroImage, styles.heroImageLoading]}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : (
            <Image
              source={images[0]?.imageUrl && !heroImageFailed ? { uri: images[0].imageUrl } : venue.heroImage}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setHeroImageFailed(true)}
            />
          )}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={18} color={colors.headingText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            {venue.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={styles.verifiedText}>{t('venueDetail.verified')}</Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#D97706" />
              <Text style={styles.ratingText}>
                {venue.rating} ({venue.reviewCount} {t('venueDetail.reviewsCountWord')})
              </Text>
            </View>
          </View>
          <Text style={styles.venueName}>{venue.name.toUpperCase()}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.bodyText} />
            <Text style={styles.addressText}>{venue.address}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => selectTab(tab.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.tabText, tab.key === activeTab && styles.tabTextActive]}>{tab.label}</Text>
              {tab.key === activeTab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'about' && (
        <View style={styles.content}>
          {/* Quick info */}
          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickInfoLabel}>{t('venueDetail.hours')}</Text>
              <Text style={styles.quickInfoValue}>{venue.hours}</Text>
            </View>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Ionicons name="grid-outline" size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickInfoLabel}>{t('venueDetail.capacity')}</Text>
              <Text style={styles.quickInfoValue}>{venue.capacityLabel}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="map-outline" size={18} color={colors.headingText} />
              <Text style={styles.sectionTitle}>{t('venueDetail.location')}</Text>
            </View>
            <View style={styles.locationCard}>
              <TouchableOpacity
                style={styles.mapArea}
                onPress={openVenueMap}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('venueDetail.location')}
              >
                <AppMap markers={mapMarkers} initialRegion={mapRegion} />
                <View style={styles.mapExpandHint} pointerEvents="none">
                  <Ionicons name="expand-outline" size={16} color={colors.white} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitleDark}>{t('venueDetail.schedule')}</Text>
              <TouchableOpacity onPress={() => router.push(ROUTES.SCHEDULE)} accessibilityRole="button">
                <Text style={styles.linkText}>{t('venueDetail.viewCalendar')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleDateTime}>
                  {venue.schedule.dateLabel} {venue.schedule.timeLabel}
                </Text>
                <Text style={styles.schedulePitch}>{venue.schedule.pitchLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.editRow}
                onPress={() => comingSoon('Edit booking')}
                accessibilityRole="button"
              >
                <Text style={styles.editText}>{t('venueDetail.edit')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Extra services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('venueDetail.extraServices')}</Text>
            <View style={styles.extraServiceCard}>
              <View style={styles.extraServiceIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" />
              </View>
              <View style={styles.extraServiceInfo}>
                <Text style={styles.extraServiceLabel}>{venue.extraService.label}</Text>
                <Text style={styles.extraServicePrice}>{venue.extraService.priceLabel}</Text>
              </View>
              <Switch
                value={refereeHired}
                onValueChange={setRefereeHired}
                trackColor={{ true: '#2563EB', false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* Contact venue */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="call-outline" size={18} color={colors.headingText} />
              <Text style={styles.sectionTitle}>{t('venueDetail.contactVenue')}</Text>
            </View>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                {venue.contact.avatarUrl ? (
                  <Image source={{ uri: venue.contact.avatarUrl }} style={styles.contactAvatarImage} />
                ) : (
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{venue.contact.name.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.contactName}>{venue.contact.name}</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {activeTab === 'pricing' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Ionicons name="pricetag-outline" size={18} color={colors.headingText} />
                <Text style={styles.sectionTitle}>{t('venueDetail.tabPricing')}</Text>
              </View>
              {fields.length === 0 ? (
                <Text style={styles.amenityText}>{t('venueDetail.noPitchesToPrice')}</Text>
              ) : (
                fields.map((field) => (
                  <View key={field.fieldId} style={styles.scheduleCard}>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleDateTime}>{field.name}</Text>
                      <Text style={styles.schedulePitch}>{fieldSportLabel(field)}</Text>
                    </View>
                    <Text style={styles.priceValue}>{formatVnd(field.pricePerHour)}</Text>
                    <Text style={styles.priceUnit}>{t('venueDetail.priceUnit')}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Ionicons name="star-outline" size={18} color={colors.headingText} />
                <Text style={styles.sectionTitle}>{t('venueDetail.tabReviews')}</Text>
              </View>
              {reviewRatingError ? (
                <Text style={styles.amenityText}>{reviewRatingError}</Text>
              ) : reviewRating ? (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#D97706" />
                  <Text style={styles.ratingText}>
                    {reviewRating.avgRating} ({reviewRating.ratingCount} {t('venueDetail.reviewsCountWord')})
                  </Text>
                </View>
              ) : (
                <Text style={styles.amenityText}>{t('venueDetail.noReviewsYet')}</Text>
              )}
            </View>

            {reviewsError ? (
              <Text style={styles.amenityText}>{reviewsError}</Text>
            ) : reviews.length === 0 ? (
              reviewRating && <Text style={styles.amenityText}>{t('venueDetail.noReviewsYet')}</Text>
            ) : (
              <View style={{ gap: 16 }}>
                {reviews.map((review) => (
                  <View key={review.reviewId} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      {review.playerAvatarUrl ? (
                        <Image source={{ uri: review.playerAvatarUrl }} style={styles.reviewAvatarImage} />
                      ) : (
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactAvatarText}>
                            {(review.playerName ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewPlayerName}>
                          {review.playerName ?? t('venueDetail.anonymousPlayer')}
                        </Text>
                        <View style={styles.reviewStarsRow}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name={i < review.rating ? 'star' : 'star-outline'}
                              size={13}
                              color="#D97706"
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.reviewText && <Text style={styles.reviewText}>{review.reviewText}</Text>}
                    {review.reply && (
                      <View style={styles.reviewReply}>
                        <Text style={styles.reviewReplyLabel}>{t('venueDetail.ownerReplyLabel')}</Text>
                        <Text style={styles.reviewText}>{review.reply.replyText}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'gallery' && (
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Ionicons name="images-outline" size={18} color={colors.headingText} />
                <Text style={styles.sectionTitle}>{t('venueDetail.tabGallery')}</Text>
              </View>
              {imagesError ? (
                <Text style={styles.amenityText}>{imagesError}</Text>
              ) : images.length === 0 ? (
                <Text style={styles.amenityText}>{t('venueDetail.noPhotosYet')}</Text>
              ) : (
                <View style={styles.galleryGrid}>
                  {images.map((image, index) => (
                    <TouchableOpacity
                      key={`${image.source}-${image.imageId}`}
                      onPress={() => setLightboxIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel="View photo"
                    >
                      <Image source={{ uri: image.imageUrl }} style={styles.galleryImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <ImageLightbox
        visible={lightboxIndex != null}
        images={images}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.startsAt}>{t('venueDetail.startsAt')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{venue.price}</Text>
            <Text style={styles.priceUnit}>{t('venueDetail.priceUnit')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.bookNowButton, !parsedHours && styles.bookNowButtonDisabled]}
          onPress={() => {
            if (!parsedHours) {
              showAlert(t('venueDetail.notAvailableYetTitle'), t('venueDetail.noOpeningHoursMessage'));
              return;
            }
            setPitchTimeVisible(true);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.bookNowText}>{t('venueDetail.bookNow')}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      {parsedHours && (
      <SelectPitchTimeModal
        visible={pitchTimeVisible}
        venueId={numericVenueId}
        pitches={venue.pitches}
        openHour={parsedHours[0]}
        closeHour={parsedHours[1]}
        hireReferee={refereeHired}
        refereeFeeVnd={REFEREE_FEE_VND}
        initialDate={initialDate}
        initialTimeFrom={initialTimeFrom}
        onClose={() => setPitchTimeVisible(false)}
        onConfirm={() => setPitchTimeVisible(false)}
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    height: 260,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageLoading: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: -48,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  venueName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: colors.headingText,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    color: colors.bodyText,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(211, 228, 254, 0.6)',
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.bodyText,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  tabIndicator: {
    marginTop: 12,
    height: 3,
    width: 28,
    borderRadius: 9999,
    backgroundColor: colors.primaryDark,
  },
  content: {
    padding: 16,
    gap: 32,
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickInfoCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 17,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
  },
  quickInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  section: {
    gap: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.headingText,
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryImage: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
  },
  parkingBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  parkingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  amenityText: {
    fontSize: 14,
    color: colors.bodyText,
  },
  locationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    gap: 12,
  },
  mapArea: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#DCE9FF',
  },
  mapExpandHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 17,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  scheduleInfo: {
    flex: 1,
    gap: 2,
  },
  scheduleDateTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  schedulePitch: {
    fontSize: 14,
    color: '#64748B',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  extraServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 17,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  extraServiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBE1FF',
  },
  extraServiceInfo: {
    flex: 1,
    gap: 2,
  },
  extraServiceLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headingText,
  },
  extraServicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  contactCard: {
    padding: 25,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D3E4FE',
  },
  contactAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewPlayerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.bodyText,
  },
  reviewText: {
    fontSize: 14,
    color: colors.bodyText,
    lineHeight: 20,
  },
  reviewReply: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  reviewReplyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  startsAt: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#2563EB',
  },
  bookNowButtonDisabled: {
    opacity: 0.4,
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
