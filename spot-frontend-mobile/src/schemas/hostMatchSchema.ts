import { z } from 'zod';
import { MATCH_MAX_PLAYERS, minPlayersForFormat } from '@/constants/matchFormats';

// Mirrors spot-backend/src/domains/matchmaking/dto/create-match.dto.js
// (courtSchema + top-level required fields) — keep in sync if that file
// changes. Recurring here only covers the "weekdays + week count" clone
// mode (Vmito-style); "specific dates" cloning is a known follow-up, not
// implemented yet (spot-backend/CLAUDE.md Host form 99:2 §9).
const courtSchema = z.object({
  name: z.string().trim().min(1, 'Court name is required').max(80, 'Court name must be at most 80 characters'),
});

export const hostMatchSchema = z
  .object({
    venueName: z.string().trim().min(1, 'Venue name is required').max(255, 'Venue name must be at most 255 characters'),
    venueAddress: z.string().trim().min(1, 'Address is required').max(500, 'Address must be at most 500 characters'),
    province: z.string().trim().min(1, 'Province is required'),
    city: z.string().trim().min(1, 'Ward/commune is required'),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
    notes: z.string().trim().max(2000, 'Notes must be at most 2000 characters').optional(),
    coverUrl: z.union([z.string().trim().url('Must be a valid URL'), z.literal('')]).optional(),
    date: z.string().trim().min(1, 'Date is required'), // YYYY-MM-DD, first/only occurrence
    timeFrom: z.string().trim().min(1, 'Start time is required'), // HH:mm
    timeTo: z.string().trim().min(1, 'End time is required'), // HH:mm
    courts: z.array(courtSchema).min(1, 'At least one named court is required').max(20, 'At most 20 courts'),
    allLevels: z.boolean().default(false),
    skillCodes: z.array(z.string()).default([]),
    format: z.string().min(1, 'Format is required'),
    maxPlayers: z.coerce
      .number()
      .int('Max players must be a whole number')
      .min(2, 'At least 2 players')
      .max(MATCH_MAX_PLAYERS, `At most ${MATCH_MAX_PLAYERS} players`),
    joinMode: z.enum(['AUTO', 'APPROVAL']).default('AUTO'),
    feeType: z.enum(['GENDER_RANGE', 'SPLIT_EVENLY']),
    priceMin: z.coerce.number().int('Must be a whole number').min(0).optional(),
    priceMax: z.coerce.number().int('Must be a whole number').min(0).optional(),
    isRecurring: z.boolean().default(false),
    recurringWeekdays: z.array(z.number().int().min(0).max(6)).default([]), // 0=Sun..6=Sat
    recurringWeeks: z.coerce.number().int().min(1).max(52).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.allLevels && data.skillCodes.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['skillCodes'], message: 'Pick a skill level or choose All Levels' });
    }

    const courtNames = data.courts.map((court) => court.name.trim().toLowerCase());
    if (new Set(courtNames).size !== courtNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courts'],
        message: 'Court names must be unique',
      });
    }

    const minPlayers = minPlayersForFormat(data.format);
    if (Number.isFinite(data.maxPlayers) && data.maxPlayers < minPlayers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxPlayers'],
        message: `At least ${minPlayers} players for this format (including host)`,
      });
    }

    if (data.feeType === 'SPLIT_EVENLY' && data.priceMin == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMin'], message: 'Total price is required' });
    }
    if (data.feeType === 'GENDER_RANGE') {
      if (data.priceMin == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMin'], message: 'Female price is required' });
      if (data.priceMax == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMax'], message: 'Male price is required' });
    }

    if (data.isRecurring) {
      if (data.recurringWeekdays.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringWeekdays'], message: 'Pick at least one weekday' });
      }
      if (data.recurringWeeks == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringWeeks'], message: 'Number of weeks is required' });
      }
    }
  });

export type HostMatchFormValues = z.output<typeof hostMatchSchema>;
export type HostMatchFormInput = z.input<typeof hostMatchSchema>;
