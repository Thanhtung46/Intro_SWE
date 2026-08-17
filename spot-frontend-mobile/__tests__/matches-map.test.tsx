import { render } from '@testing-library/react-native';
import React from 'react';
import JoinMatchMapRoute from '../app/matches/map';
import JoinMatchMapScreen from '@/screens/matches/JoinMatchMapScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/screens/matches/JoinMatchMapScreen', () => jest.fn(() => null));

function lastProps() {
  return (JoinMatchMapScreen as unknown as jest.Mock).mock.calls.at(-1)[0];
}

describe('app/matches/map.tsx (thin route)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    (JoinMatchMapScreen as unknown as jest.Mock).mockClear();
  });

  it('calls router.back() when onBack is triggered', () => {
    render(<JoinMatchMapRoute />);
    lastProps().onBack();
    expect(mockBack).toHaveBeenCalled();
  });

  it('pushes /matches/:matchId when onOpenMatch is called', () => {
    render(<JoinMatchMapRoute />);
    lastProps().onOpenMatch(9);
    expect(mockPush).toHaveBeenCalledWith('/matches/9');
  });
});
