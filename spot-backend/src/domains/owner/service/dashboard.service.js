import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { REVENUE_CURRENCY } from '../../../shared/constants/owner.js';
import {
  todayInBangkok,
  addCalendarDays,
} from '../../booking/service/booking.service.js';
import * as revenueRepository from '../repository/revenue.repository.js';
import * as dashboardRepository from '../repository/dashboard.repository.js';

const DOW_LABELS = Object.freeze([
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]);

function resolveMonthRange(monthInput) {
  const month =
    monthInput ??
    todayInBangkok().slice(0, 7);
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new AppError('Invalid month format. Use YYYY-MM', 400);
  }

  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { month, from, to };
}

function trendsRange(trendsWeeks) {
  const to = todayInBangkok();
  const from = addCalendarDays(to, -(trendsWeeks * 7 - 1));
  return { from, to };
}

function toActivity(row) {
  if (row.activity_type === 'BOOKING_CREATED') {
    return {
      type: row.activity_type,
      occurredAt: row.occurred_at,
      referenceId: row.reference_id,
      title: `New booking at ${row.field_name}`,
      venueName: row.venue_name,
      status: row.status,
    };
  }
  return {
    type: row.activity_type,
    occurredAt: row.occurred_at,
    referenceId: row.reference_id,
    title: `New ${row.rating}-star review`,
    venueName: row.venue_name,
    rating: row.rating,
  };
}

function toFacilityCard(row) {
  return {
    fieldId: row.field_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    fieldName: row.field_name,
    sportType: row.sport_type,
    status: row.status,
    isAvailableNow: Boolean(row.is_available_now),
  };
}

function normalizeBookingTrends(rows) {
  const byDay = new Map(rows.map((row) => [row.day_of_week, row.booking_count]));
  return DOW_LABELS.map((label, index) => ({
    dayOfWeek: index + 1,
    label,
    bookingCount: byDay.get(index + 1) ?? 0,
  }));
}

export async function getDashboardSummary(ownerId, query) {
  const period = resolveMonthRange(query.month);
  const trendsPeriod = trendsRange(query.trendsWeeks);

  if (query.venueId) {
    const client = await pool.connect();
    try {
      const owns = await revenueRepository.ownerOwnsVenue(
        client,
        ownerId,
        query.venueId,
      );
      if (!owns) {
        throw new AppError('Venue not found', 404);
      }
    } finally {
      client.release();
    }
  }

  const client = await pool.connect();
  try {
    const filters = {
      from: period.from,
      to: period.to,
      venueId: query.venueId,
    };

    const [
      monthlyRevenue,
      occupancy,
      pendingBookings,
      newReviews,
      trendRows,
      activities,
      facilityCards,
    ] = await Promise.all([
      revenueRepository.sumTotalRevenue(client, ownerId, filters),
      dashboardRepository.occupancyForRange(client, ownerId, period, query.venueId),
      dashboardRepository.countPendingBookings(client, ownerId, query.venueId),
      dashboardRepository.countNewReviewsInRange(
        client,
        ownerId,
        period,
        query.venueId,
      ),
      dashboardRepository.bookingTrendsByDayOfWeek(
        client,
        ownerId,
        trendsPeriod,
        query.venueId,
      ),
      dashboardRepository.listRecentActivities(client, ownerId, {
        limit: query.recentLimit,
        venueId: query.venueId,
      }),
      dashboardRepository.listFacilityCards(client, ownerId, query.venueId),
    ]);

    return {
      kpis: {
        monthlyRevenue: {
          amount: monthlyRevenue,
          currency: REVENUE_CURRENCY,
          period,
        },
        occupancyRate: {
          percent: occupancy.percent,
          bookedHours: occupancy.bookedHours,
          availableHours: occupancy.availableHours,
          period,
        },
        pendingBookings: {
          count: pendingBookings.count,
          urgentCount: pendingBookings.urgentCount,
        },
        newReviews: {
          count: newReviews,
          period,
        },
      },
      bookingTrends: {
        period: trendsPeriod,
        points: normalizeBookingTrends(trendRows),
      },
      recentActivities: activities.map(toActivity),
      facilityCards: facilityCards.map(toFacilityCard),
    };
  } finally {
    client.release();
  }
}
