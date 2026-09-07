import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import ScheduleScreen from '@/screens/schedule/ScheduleScreen';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useScheduleCache } from '@/state/scheduleCache';
import { getMySchedule, ScheduleItem } from '@/services/scheduleService';

const mockPush = jest.fn();

// jest-expo's preset does not auto-wire this the way the native module
// resolves at runtime — LanguageContext/ThemeContext both read it on mount.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  // Run the focus callback once on mount instead of wiring real navigation focus events.
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(callback, []);
  },
}));

jest.mock('@/services/scheduleService', () => ({
  ...jest.requireActual('@/services/scheduleService'),
  getMySchedule: jest.fn(),
}));

const mockedGetMySchedule = getMySchedule as jest.MockedFunction<typeof getMySchedule>;

function today(): Date {
  return new Date();
}

function isoAt(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderSchedule() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <ScheduleScreen />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

async function selectToday() {
  const day = today().getDate();
  await waitFor(() => expect(screen.getByTestId(`schedule-day-${day}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId(`schedule-day-${day}`));
}

describe('ScheduleScreen', () => {
  beforeEach(() => {
    useScheduleCache.setState({ data: null, lastFetchedAt: null, isRefreshing: false, error: null });
    mockedGetMySchedule.mockReset();
    mockPush.mockClear();
  });

  it('renders the calendar grid for the current month', async () => {
    mockedGetMySchedule.mockResolvedValue({ success: true, items: [] });
    renderSchedule();
    expect(screen.getByText('MON')).toBeTruthy();
    expect(screen.getByText('SUN')).toBeTruthy();
    await waitFor(() => expect(mockedGetMySchedule).toHaveBeenCalled());
  });

  it('shows the pickup match host name for a match the player joined (US1 / FR-001, FR-002)', async () => {
    const items: ScheduleItem[] = [
      {
        type: 'MATCH',
        bookingId: null,
        matchId: 9,
        startsAt: isoAt(today(), 18),
        endsAt: isoAt(today(), 19),
        bookingDate: localDate(today()),
        status: 'OPEN',
        displayStatus: 'UPCOMING',
        venueName: 'Skyline Arena',
        fieldName: '',
        address: '123 Sports Lane',
        sportType: 'Football',
        role: 'PARTICIPANT',
        hostName: 'Nguyen Van A',
        totalAmountVnd: null,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText(/Nguyen Van A/)).toBeTruthy());
  });

  it('indicates the player is hosting for a match they host (US1 / FR-002)', async () => {
    const items: ScheduleItem[] = [
      {
        type: 'MATCH',
        bookingId: null,
        matchId: 10,
        startsAt: isoAt(today(), 18),
        endsAt: isoAt(today(), 19),
        bookingDate: localDate(today()),
        status: 'OPEN',
        displayStatus: 'UPCOMING',
        venueName: 'Skyline Arena',
        fieldName: '',
        address: '123 Sports Lane',
        sportType: 'Football',
        role: 'HOST',
        hostName: 'Current Player',
        totalAmountVnd: null,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText('You are hosting')).toBeTruthy());
  });

  it('shows a neutral placeholder when a match has no host name (edge case)', async () => {
    const items: ScheduleItem[] = [
      {
        type: 'MATCH',
        bookingId: null,
        matchId: 11,
        startsAt: isoAt(today(), 18),
        endsAt: isoAt(today(), 19),
        bookingDate: localDate(today()),
        status: 'OPEN',
        displayStatus: 'UPCOMING',
        venueName: 'Skyline Arena',
        fieldName: '',
        address: '123 Sports Lane',
        sportType: 'Football',
        role: 'PARTICIPANT',
        hostName: null,
        totalAmountVnd: null,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText(/Host unavailable/)).toBeTruthy());
  });

  it('shows IN PROGRESS for an item between its start and end time (US2 / FR-004)', async () => {
    const now = today();
    const items: ScheduleItem[] = [
      {
        type: 'BOOKING',
        bookingId: 5,
        matchId: null,
        startsAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        bookingDate: localDate(now),
        status: 'PAID',
        displayStatus: 'IN_PROGRESS',
        venueName: 'Skyline Arena',
        fieldName: 'Pitch A',
        address: '123 Sports Lane',
        sportType: 'Football',
        totalAmountVnd: 250000,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText('IN PROGRESS')).toBeTruthy());
  });

  it('shows COMPLETED and the Leave Review action once a booking auto-completes (US2 / FR-005, FR-007)', async () => {
    const items: ScheduleItem[] = [
      {
        type: 'BOOKING',
        bookingId: 6,
        matchId: null,
        startsAt: isoAt(today(), 8),
        endsAt: isoAt(today(), 9),
        bookingDate: localDate(today()),
        status: 'COMPLETED',
        displayStatus: 'COMPLETED',
        venueName: 'Skyline Arena',
        fieldName: 'Pitch A',
        address: '123 Sports Lane',
        sportType: 'Football',
        totalAmountVnd: 250000,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeTruthy());
    expect(screen.getByTestId(`schedule-leave-review-${items[0].type}-${items[0].bookingId}-`)).toBeTruthy();
  });

  it('narrows the day list to only bookings when the Bookings filter is applied (US3 / FR-008, FR-009)', async () => {
    const items: ScheduleItem[] = [
      {
        type: 'BOOKING',
        bookingId: 7,
        matchId: null,
        startsAt: isoAt(today(), 18),
        endsAt: isoAt(today(), 19),
        bookingDate: localDate(today()),
        status: 'PAID',
        displayStatus: 'UPCOMING',
        venueName: 'Skyline Arena',
        fieldName: 'Pitch A',
        address: '123 Sports Lane',
        sportType: 'Football',
        totalAmountVnd: 250000,
      },
      {
        type: 'MATCH',
        bookingId: null,
        matchId: 12,
        startsAt: isoAt(today(), 20),
        endsAt: isoAt(today(), 21),
        bookingDate: localDate(today()),
        status: 'OPEN',
        displayStatus: 'UPCOMING',
        venueName: 'Sunset Court',
        fieldName: '',
        address: '456 Play St',
        sportType: 'Badminton',
        role: 'PARTICIPANT',
        hostName: 'Host Name',
        totalAmountVnd: null,
      },
    ];
    mockedGetMySchedule.mockResolvedValue({ success: true, items });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText('Skyline Arena • Pitch A')).toBeTruthy());
    expect(screen.getByText('Sunset Court')).toBeTruthy();

    fireEvent.press(screen.getByTestId('schedule-filter-BOOKING'));
    await waitFor(() => expect(screen.queryByText('Sunset Court')).toBeNull());
    expect(screen.getByText('Skyline Arena • Pitch A')).toBeTruthy();
  });

  it('shows "No matches on this day" when the selected day has no events', async () => {
    mockedGetMySchedule.mockResolvedValue({ success: true, items: [] });
    renderSchedule();
    await selectToday();
    await waitFor(() => expect(screen.getByText('No matches on this day')).toBeTruthy());
  });
});
