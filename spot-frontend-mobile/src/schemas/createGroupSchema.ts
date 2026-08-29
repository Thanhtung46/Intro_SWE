import { z } from 'zod';

// Mirrors spot-backend/src/domains/groups/dto/create-group.dto.js — keep in
// sync if that file changes. Same local-useState + .safeParse()-on-submit
// pattern as hostMatchSchema.ts (this form is equally widget-heavy:
// province/city SelectField, PinDropModal, dynamic courts list, skill
// chips, plus a recurring-slot builder more complex than Matches' single
// date/time — see CreateGroupScreen.tsx).
const courtSchema = z.object({
  name: z.string().trim().min(1, 'Court name is required').max(80, 'Court name must be at most 80 characters'),
});

// dayOfWeek is ISO 1(Mon)-7(Sun) here — the OPPOSITE of hostMatchSchema's
// recurringWeekdays (JS Date.getDay(), 0=Sun) — see src/types/group.ts's
// RecurringSlot comment for the conversion rule.
const recurringSlotSchema = z.object({
  dayOfWeek: z.number().int().min(1, 'Pick a weekday').max(7, 'Pick a weekday'),
  startsAt: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, 'Start time must be on a 30-minute boundary'),
  durationMinutes: z.number().int().min(30, 'At least 30 minutes').multipleOf(30, 'Duration must be a multiple of 30 minutes'),
  courtName: z.string().trim().min(1, 'Pick a court'),
});

export const createGroupSchema = z
  .object({
    name: z.string().trim().min(1, 'Group name is required').max(150, 'Group name must be at most 150 characters'),
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
    description: z.string().trim().max(5000, 'Description must be at most 5000 characters').optional(),
    joinMode: z.enum(['AUTO', 'APPROVAL']).default('AUTO'),
    venueName: z.string().trim().min(1, 'Venue name is required').max(255, 'Venue name must be at most 255 characters'),
    venueAddress: z.string().trim().min(1, 'Address is required').max(500, 'Address must be at most 500 characters'),
    province: z.string().trim().min(1, 'Province is required'),
    city: z.string().trim().min(1, 'Ward/commune is required'),
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    allLevels: z.boolean().default(false),
    skillCodes: z.array(z.string()).default([]),
    zaloUrl: z.union([z.string().trim().url('Must be a valid URL'), z.literal('')]).optional(),
    logoUrl: z.union([z.string().trim().url('Must be a valid URL'), z.literal('')]).optional(),
    coverUrl: z.union([z.string().trim().url('Must be a valid URL'), z.literal('')]).optional(),
    courts: z.array(courtSchema).min(1, 'At least one named court is required').max(20, 'At most 20 courts'),
    recurringSlots: z.array(recurringSlotSchema).min(1, 'At least one weekly slot is required').max(100, 'At most 100 slots'),
  })
  .superRefine((data, ctx) => {
    if (!data.allLevels && data.skillCodes.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['skillCodes'], message: 'Pick a skill level or choose All Levels' });
    }

    const courtNames = new Set(data.courts.map((c) => c.name.trim().toLowerCase()));
    if (courtNames.size !== data.courts.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['courts'], message: 'Court names must be unique' });
    }

    data.recurringSlots.forEach((slot, index) => {
      if (!courtNames.has(slot.courtName.trim().toLowerCase())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringSlots', index, 'courtName'], message: 'Court not found — add it above first' });
      }
      const [h, m] = slot.startsAt.split(':').map(Number);
      if ((h * 60 + m) + slot.durationMinutes > 24 * 60) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringSlots', index, 'durationMinutes'], message: "Slot can't cross midnight" });
      }
    });

    // No two slots on the same court+day may overlap.
    for (let i = 0; i < data.recurringSlots.length; i += 1) {
      for (let j = i + 1; j < data.recurringSlots.length; j += 1) {
        const a = data.recurringSlots[i];
        const b = data.recurringSlots[j];
        if (a.dayOfWeek !== b.dayOfWeek || a.courtName.trim().toLowerCase() !== b.courtName.trim().toLowerCase()) continue;
        const [aH, aM] = a.startsAt.split(':').map(Number);
        const [bH, bM] = b.startsAt.split(':').map(Number);
        const aStart = aH * 60 + aM;
        const bStart = bH * 60 + bM;
        const aEnd = aStart + a.durationMinutes;
        const bEnd = bStart + b.durationMinutes;
        if (aStart < bEnd && bStart < aEnd) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurringSlots', j], message: 'Overlaps another slot on the same court and day' });
        }
      }
    }
  });

export type CreateGroupFormValues = z.output<typeof createGroupSchema>;
export type CreateGroupFormInput = z.input<typeof createGroupSchema>;
