import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { DEFAULT_REFEREE_FEE_VND } from '../../../shared/constants/referee.js';
import * as venueRegistrationRepository from '../repository/venue-registration.repository.js';
import * as assignmentRepository from '../repository/assignment.repository.js';
import { notifyRefereeInvitation } from './referee-notify.js';

async function fetchBookingNotificationMeta(client, bookingId) {
  const { rows } = await client.query(
    `SELECT
       b.booking_id,
       lower(b.booking_time_range) AS starts_at,
       f.sport_type,
       v.name AS venue_name
     FROM schema_booking.bookings b
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE b.booking_id = $1`,
    [bookingId],
  );
  return rows[0] ?? null;
}

async function dispatchInvitationNotifications(invitations, meta, bookingId) {
  if (!invitations.length || !meta) return;
  await Promise.all(
    invitations.map((inv) =>
      notifyRefereeInvitation({
        refereeId: inv.refereeId,
        assignmentId: inv.assignmentId,
        bookingId,
        venueName: meta.venue_name,
        sportType: meta.sport_type,
        startsAt: meta.starts_at,
        feeVnd: inv.feeVnd,
      })),
  );
}

/**
 * When booking becomes PAID with hire_referee, fan-out PENDING invitations
 * to all referees in the venue pool for that field's sport.
 */
export async function fanOutRefereeInvitations(bookingId, client = null) {
  const ownedClient = !client;
  const db = client ?? (await pool.connect());
  try {
    if (ownedClient) await db.query('BEGIN');

    const { rows: bookingRows } = await db.query(
      `SELECT b.booking_id, b.hire_referee, b.referee_fee_vnd, b.status,
              f.venue_id, f.sport_type
       FROM schema_booking.bookings b
       JOIN schema_venue.fields f ON f.field_id = b.field_id
       WHERE b.booking_id = $1
       FOR UPDATE`,
      [bookingId],
    );
    const booking = bookingRows[0];
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    if (!booking.hire_referee) {
      if (ownedClient) await db.query('COMMIT');
      return { created: 0, notificationsSent: 0 };
    }
    if (booking.status !== 'PAID' && booking.status !== 'CHECKED_IN') {
      if (ownedClient) await db.query('COMMIT');
      return { created: 0, skipped: 'booking_not_paid', notificationsSent: 0 };
    }

    const feeVnd = Number(booking.referee_fee_vnd ?? DEFAULT_REFEREE_FEE_VND);
    const referees = await venueRegistrationRepository.listActiveRefereesForVenueSport(
      db,
      booking.venue_id,
      booking.sport_type,
    );

    const invitations = [];
    for (const ref of referees) {
      const row = await assignmentRepository.insertPendingAssignment(db, {
        bookingId: booking.booking_id,
        venueId: booking.venue_id,
        refereeId: ref.referee_id,
        feeVnd,
      });
      if (row) {
        invitations.push({
          assignmentId: row.assignment_id,
          refereeId: row.referee_id,
          feeVnd,
        });
      }
    }

    const meta = await fetchBookingNotificationMeta(db, booking.booking_id);

    if (ownedClient) {
      await db.query('COMMIT');
      await dispatchInvitationNotifications(invitations, meta, booking.booking_id);
    }

    return {
      created: invitations.length,
      refereeCount: referees.length,
      notificationsSent: ownedClient ? invitations.length : 0,
      invitations: ownedClient ? undefined : invitations,
      meta: ownedClient ? undefined : meta,
    };
  } catch (err) {
    if (ownedClient) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (ownedClient) db.release();
  }
}

export { dispatchInvitationNotifications };
