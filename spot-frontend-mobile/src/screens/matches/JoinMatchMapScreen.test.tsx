import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import JoinMatchMapScreen from './JoinMatchMapScreen';
import { getErrorMessage, listMatches } from '@/services/matchService';
import type { Match } from '@/types/match';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/services/matchService');

const mockListMatches = listMatches as jest.MockedFunction<typeof listMatches>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<typeof getErrorMessage>;

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 9,
    hostUserId: 101,
    hostFullName: 'Minh Chau',
    host: { userId: 101, fullName: 'Minh Chau', avatarUrl: null, matchCount: 45, rating: null },
    coverUrl: null,
    isFavorited: false,
    participantAvatars: [],
    sport: 'BADMINTON',
    format: 'SINGLES',
    title: 'Advanced Singles Smash',
    notes: null,
    venueName: 'Sân Be Badminton',
    venueAddress: 'Gò Vấp, HCMC',
    latitude: 10.8386,
    longitude: 106.6626,
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    isMultiDay: false,
    isRecurring: false,
    maxPlayers: 2,
    filledCount: 0,
    spotsLeft: 2,
    squad: { filled: 0, max: 2 },
    skillMin: 'FAIR',
    skillMax: 'PROFESSIONAL',
    allLevels: false,
    feeType: 'SPLIT_EVENLY',
    priceMin: 120000,
    priceMax: null,
    yourShare: 60000,
    joinMode: 'APPROVAL',
    status: 'OPEN',
    courtCount: 1,
    courts: [{ courtId: 2, name: 'Court 3', sortOrder: 1 }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = { onBack: jest.fn(), onOpenMatch: jest.fn() };

describe('JoinMatchMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetErrorMessage.mockImplementation((err) => (err instanceof Error ? err.message : 'Something went wrong.'));
  });

  it('renders the list-fallback banner and the bottom nav (Matches tab active)', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<JoinMatchMapScreen {...defaultProps} />);
    await waitFor(() => expect(mockListMatches).toHaveBeenCalled());
    expect(screen.getByText(/Map view is coming soon/)).toBeTruthy();
    expect(screen.getByTestId('bottom-nav-matches')).toBeTruthy();
  });

  it('re-fetches with sport=FOOTBALL when the Football category chip is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<JoinMatchMapScreen {...defaultProps} />);
    await waitFor(() => expect(mockListMatches).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByTestId('join-map-category-football'));
    await waitFor(() =>
      expect(mockListMatches).toHaveBeenLastCalledWith(expect.objectContaining({ sport: 'FOOTBALL' }))
    );
  });

  it('calls onOpenMatch when a match card is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    render(<JoinMatchMapScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('match-card-9')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-card-9'));
    expect(defaultProps.onOpenMatch).toHaveBeenCalledWith(9);
  });

  it('calls onBack when the back button is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<JoinMatchMapScreen {...defaultProps} />);
    await waitFor(() => expect(mockListMatches).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('join-map-back'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });
});
