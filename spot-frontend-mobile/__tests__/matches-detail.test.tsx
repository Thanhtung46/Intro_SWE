import { render } from '@testing-library/react-native';
import React from 'react';
import MatchDetailRoute from '../app/matches/[id]';
import MatchDetailScreen from '@/screens/matches/MatchDetailScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: '7' }),
}));

jest.mock('@/screens/matches/MatchDetailScreen', () => jest.fn(() => null));

function lastProps() {
  return (MatchDetailScreen as unknown as jest.Mock).mock.calls.at(-1)[0];
}

describe('app/matches/[id].tsx (thin route)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    (MatchDetailScreen as unknown as jest.Mock).mockClear();
  });

  it('parses the :id route param into a number matchId', () => {
    render(<MatchDetailRoute />);
    expect(lastProps().matchId).toBe(7);
  });

  it('calls router.back() when onBack is triggered', () => {
    render(<MatchDetailRoute />);
    lastProps().onBack();
    expect(mockBack).toHaveBeenCalled();
  });

  it('pushes /matches/host/:hostUserId when onOpenHostProfile is called', () => {
    render(<MatchDetailRoute />);
    lastProps().onOpenHostProfile(101);
    expect(mockPush).toHaveBeenCalledWith('/matches/host/101');
  });

  it('does not navigate for onOpenMap — shows a coming-soon alert instead', () => {
    render(<MatchDetailRoute />);
    lastProps().onOpenMap();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
