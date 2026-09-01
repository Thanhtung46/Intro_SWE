export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_TEXT_MAX_LENGTH = 2000;
export const REVIEW_REPLY_MAX_LENGTH = 2000;

/** Referee rating: half-star steps from 0.5 to 5.0 (rating only, no text). */
export const REFEREE_REVIEW_RATING_MIN = 0.5;
export const REFEREE_REVIEW_RATING_MAX = 5;
export const REFEREE_REVIEW_RATING_STEP = 0.5;

/** Soft spam: max reviews a player can create per rolling day. */
export const REVIEW_MAX_PER_PLAYER_PER_DAY = 10;

/** Redis cache for venue rating aggregate. */
export const VENUE_RATING_REDIS_PREFIX = 'venue:rating:';
export const VENUE_RATING_REDIS_TTL_SECONDS = 3600;
