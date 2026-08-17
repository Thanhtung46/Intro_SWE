import { render } from '@testing-library/react-native';
import React from 'react';
import MatchesHomepageRoute from '../app/matches/index';
import MatchesHomepageScreen from '@/screens/matches/MatchesHomepageScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/screens/matches/MatchesHomepageScreen', () => jest.fn(() => null));

function lastProps() {
  return (MatchesHomepageScreen as unknown as jest.Mock).mock.calls.at(-1)[0];
}

describe('app/matches/index.tsx (thin route)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    (MatchesHomepageScreen as unknown as jest.Mock).mockClear();
  });

  it('pushes /matches/map when onOpenMap is called', () => {
    render(<MatchesHomepageRoute />);
    lastProps().onOpenMap();
    expect(mockPush).toHaveBeenCalledWith('/matches/map');
  });

  it('pushes /matches/:id when onOpenMatch is called', () => {
    render(<MatchesHomepageRoute />);
    lastProps().onOpenMatch(42);
    expect(mockPush).toHaveBeenCalledWith('/matches/42');
  });

  it('pushes /matches/mine when onManageMatches is called', () => {
    render(<MatchesHomepageRoute />);
    lastProps().onManageMatches();
    expect(mockPush).toHaveBeenCalledWith('/matches/mine');
  });

  it('does not navigate for onHostMatch — shows a coming-soon alert instead', () => {
    render(<MatchesHomepageRoute />);
    lastProps().onHostMatch();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
