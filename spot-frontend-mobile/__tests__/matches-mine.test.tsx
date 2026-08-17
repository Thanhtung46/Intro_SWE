import { render } from '@testing-library/react-native';
import React from 'react';
import ManageMatchesRoute from '../app/matches/mine';
import ManageMatchesScreen from '@/screens/matches/ManageMatchesScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/screens/matches/ManageMatchesScreen', () => jest.fn(() => null));

function lastProps() {
  return (ManageMatchesScreen as unknown as jest.Mock).mock.calls.at(-1)[0];
}

describe('app/matches/mine.tsx (thin route)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    (ManageMatchesScreen as unknown as jest.Mock).mockClear();
  });

  it('calls router.back() when onBack is triggered', () => {
    render(<ManageMatchesRoute />);
    lastProps().onBack();
    expect(mockBack).toHaveBeenCalled();
  });

  it('pushes /matches/:matchId when onOpenMatch is called', () => {
    render(<ManageMatchesRoute />);
    lastProps().onOpenMatch(3);
    expect(mockPush).toHaveBeenCalledWith('/matches/3');
  });
});
