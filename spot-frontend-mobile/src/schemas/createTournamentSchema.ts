import { z } from 'zod';

// Mirrors spot-backend/src/domains/tournaments/dto/create-tournament.dto.js —
// keep in sync if that file changes. Same local-useState + .safeParse()-on-submit
// pattern as createGroupSchema.ts / hostMatchSchema.ts (this form is widget-heavy:
// format chips, gender toggle, province/city SelectField, PinDropModal, three
// datetime pickers). coverUrl / description / latitude / longitude are all
// REQUIRED by the backend, not optional.

const FOOTBALL_FORMATS = ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'];
const BADMINTON_FORMATS = ['MS', 'WS', 'MD', 'WD', 'MIXED'];

const isoDatetime = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => Number.isFinite(Date.parse(v)), 'Pick a date and time');

export const createTournamentSchema = z
  .object({
    sport: z.enum(['FOOTBALL', 'BADMINTON']),
    format: z.string().min(1, 'Pick a format'),
    genderDivision: z.enum(['MEN', 'WOMEN']).nullable(),
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
    coverUrl: z.string().trim().url('Cover image must be a valid URL'),
    description: z
      .string()
      .trim()
      .min(1, 'Description is required')
      .max(10000, 'Description must be at most 10000 characters'),
    venueName: z.string().trim().min(1, 'Venue name is required').max(255, 'Venue name must be at most 255 characters'),
    venueAddress: z.string().trim().min(1, 'Address is required').max(500, 'Address must be at most 500 characters'),
    province: z.string().trim().min(1, 'Province is required'),
    city: z.string().trim().min(1, 'Ward/commune is required'),
    latitude: z.number({ error: 'Set the location on the map' }),
    longitude: z.number({ error: 'Set the location on the map' }),
    startsAt: isoDatetime,
    endsAt: isoDatetime,
    registrationDeadline: isoDatetime,
    maxTeams: z.coerce
      .number({ error: 'Enter a number' })
      .int('Max teams must be a whole number')
      .min(2, 'At least 2 teams')
      .max(128, 'At most 128 teams'),
    registrationFeeVnd: z.coerce.number({ error: 'Enter a number' }).int('Whole number only').min(0, 'Cannot be negative'),
    prizePoolVnd: z.coerce.number({ error: 'Enter a number' }).int('Whole number only').min(0, 'Cannot be negative'),
  })
  .superRefine((data, ctx) => {
    const allowed = data.sport === 'FOOTBALL' ? FOOTBALL_FORMATS : BADMINTON_FORMATS;
    if (!allowed.includes(data.format)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['format'], message: 'Pick a valid format for this sport' });
    }
    if (data.sport === 'FOOTBALL' && !data.genderDivision) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['genderDivision'], message: 'Pick a gender division' });
    }

    const starts = Date.parse(data.startsAt);
    const ends = Date.parse(data.endsAt);
    const deadline = Date.parse(data.registrationDeadline);
    if (Number.isFinite(starts) && Number.isFinite(ends) && ends < starts) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End must be on or after the start' });
    }
    if (Number.isFinite(starts) && Number.isFinite(deadline) && deadline > starts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationDeadline'],
        message: 'Deadline must be on or before the start',
      });
    }
    if (Number.isFinite(starts) && starts <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Start must be in the future' });
    }
  });

export type CreateTournamentFormValues = z.output<typeof createTournamentSchema>;
export type CreateTournamentFormInput = z.input<typeof createTournamentSchema>;
