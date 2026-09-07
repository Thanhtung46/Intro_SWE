import { createStaleCache } from './createStaleCache';
import type { ScheduleEvent } from '@/screens/schedule/ScheduleScreen';

/** Schedule tab's events for the currently-viewed month, keyed implicitly by `currentMonth` (single active month at a time). */
export const useScheduleCache = createStaleCache<ScheduleEvent[]>();
