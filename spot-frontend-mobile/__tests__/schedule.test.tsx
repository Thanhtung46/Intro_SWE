import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import ScheduleScreen from '../app/schedule';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function eventDays() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = today.getDate();
  const clamp = (day: number) => Math.min(Math.max(day, 1), daysInMonth);

  return {
    today: todayDay,
    completed: clamp(todayDay - 5),
    upcoming: clamp(todayDay + 3),
    all: [clamp(todayDay - 5), clamp(todayDay - 2), todayDay, clamp(todayDay + 3), clamp(todayDay + 7)],
    daysInMonth,
    monthName: MONTH_NAMES[month],
  };
}

function findFreeDay(occupied: number[], daysInMonth: number) {
  for (let day = 1; day <= daysInMonth; day++) {
    if (!occupied.includes(day)) {
      return day;
    }
  }
  throw new Error('No free day found');
}

describe('ScheduleScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the calendar grid for the current month', () => {
    const { monthName } = eventDays();
    render(<ScheduleScreen />);
    expect(screen.getByText(new RegExp(monthName))).toBeTruthy();
    expect(screen.getByText('MON')).toBeTruthy();
    expect(screen.getByText('SUN')).toBeTruthy();
  });

  it('shows the upcoming match card for today by default', () => {
    const { today } = eventDays();
    render(<ScheduleScreen />);
    expect(screen.getByText(/MATCHES ON/)).toBeTruthy();
    expect(screen.getByTestId(`schedule-day-${today}`)).toBeTruthy();
    expect(screen.getByText('UPCOMING')).toBeTruthy();
    expect(screen.getByText('Football 7v7')).toBeTruthy();
    expect(screen.getByText('Match Details')).toBeTruthy();
  });

  it('shows the completed match card and Leave Review button when a past event day is selected', () => {
    const { completed } = eventDays();
    render(<ScheduleScreen />);
    fireEvent.press(screen.getByTestId(`schedule-day-${completed}`));
    expect(screen.getByText('COMPLETED')).toBeTruthy();
    expect(screen.getByText('Badminton Doubles')).toBeTruthy();
    expect(screen.getByText('Leave Review')).toBeTruthy();
  });

  it('shows "No matches on this day" when selecting a day without events', () => {
    const { all, daysInMonth } = eventDays();
    const freeDay = findFreeDay(all, daysInMonth);
    render(<ScheduleScreen />);
    fireEvent.press(screen.getByTestId(`schedule-day-${freeDay}`));
    expect(screen.getByText('No matches on this day')).toBeTruthy();
  });

  it('calls the Coming soon alert when Match Details is pressed', () => {
    render(<ScheduleScreen />);
    fireEvent.press(screen.getByText('Match Details'));
    expect(Alert.alert).toHaveBeenCalledWith('Coming soon', 'Match Details is not available yet.');
  });

  it('calls the Coming soon alert when Leave Review is pressed', () => {
    const { completed } = eventDays();
    render(<ScheduleScreen />);
    fireEvent.press(screen.getByTestId(`schedule-day-${completed}`));
    fireEvent.press(screen.getByText('Leave Review'));
    expect(Alert.alert).toHaveBeenCalledWith('Coming soon', 'Leave Review is not available yet.');
  });

  it('calls router.back() when the back button is pressed', () => {
    render(<ScheduleScreen />);
    fireEvent.press(screen.getByTestId('schedule-back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
