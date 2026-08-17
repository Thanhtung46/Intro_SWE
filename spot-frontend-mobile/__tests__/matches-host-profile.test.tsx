import { render } from '@testing-library/react-native';
import React from 'react';
import CheckProfileRoute from '../app/matches/host/[id]';
import CheckProfileScreen from '@/screens/matches/CheckProfileScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: '101' }),
}));

jest.mock('@/screens/matches/CheckProfileScreen', () => jest.fn(() => null));

function lastProps() {
  return (CheckProfileScreen as unknown as jest.Mock).mock.calls.at(-1)[0];
}

describe('app/matches/host/[id].tsx (thin route)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    (CheckProfileScreen as unknown as jest.Mock).mockClear();
  });

  it('parses the :id route param into a number hostUserId', () => {
    render(<CheckProfileRoute />);
    expect(lastProps().hostUserId).toBe(101);
  });

  it('calls router.back() when onBack is triggered', () => {
    render(<CheckProfileRoute />);
    lastProps().onBack();
    expect(mockBack).toHaveBeenCalled();
  });

  it('pushes /matches/:matchId when onOpenMatch is called', () => {
    render(<CheckProfileRoute />);
    lastProps().onOpenMatch(5);
    expect(mockPush).toHaveBeenCalledWith('/matches/5');
  });
});
