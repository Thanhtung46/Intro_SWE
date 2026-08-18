export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_TEXT_MAX_LENGTH = 2000;
export const REVIEW_REPLY_MAX_LENGTH = 2000;

/** Soft spam: max reviews a player can create per rolling day. */
export const REVIEW_MAX_PER_PLAYER_PER_DAY = 10;

/** Redis cache for venue rating aggregate. */
export const VENUE_RATING_REDIS_PREFIX = 'venue:rating:';
export const VENUE_RATING_REDIS_TTL_SECONDS = 3600;
