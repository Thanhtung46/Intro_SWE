import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import MatchesHomepageScreen from './MatchesHomepageScreen';
import { UserProvider } from '@/context/UserContext';
import { getErrorMessage, getVnAdminTree, listMatches, setFavorite } from '@/services/matchService';
import type { Match } from '@/types/match';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/services/matchService');

const mockListMatches = listMatches as jest.MockedFunction<typeof listMatches>;
const mockSetFavorite = setFavorite as jest.MockedFunction<typeof setFavorite>;
const mockGetVnAdminTree = getVnAdminTree as jest.MockedFunction<typeof getVnAdminTree>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<typeof getErrorMessage>;

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 1,
    hostUserId: 101,
    hostFullName: 'Alex Nguyen',
    host: { userId: 101, fullName: 'Alex Nguyen', avatarUrl: null, matchCount: 120, rating: null },
    coverUrl: null,
    isFavorited: false,
    participantAvatars: [],
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title: 'Friday Night 7v7 - Pro League',
    notes: null,
    venueName: 'Saigon Sports Arena',
    venueAddress: 'District 7 Arena, HCMC',
    latitude: 10.7326,
    longitude: 106.7217,
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    isMultiDay: false,
    isRecurring: false,
    maxPlayers: 14,
    filledCount: 10,
    spotsLeft: 4,
    squad: { filled: 10, max: 14 },
    skillMin: 'REC_ADVANCED',
    skillMax: 'SEMI_PRO',
    allLevels: false,
    feeType: 'SPLIT_EVENLY',
    priceMin: 630000,
    priceMax: null,
    yourShare: 45000,
    joinMode: 'APPROVAL',
    status: 'OPEN',
    courtCount: 1,
    courts: [{ courtId: 1, name: null, sortOrder: 1 }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = {
  onOpenMap: jest.fn(),
  onOpenMatch: jest.fn(),
  onHostMatch: jest.fn(),
  onManageMatches: jest.fn(),
};

function renderScreen() {
  return render(
    <UserProvider>
      <MatchesHomepageScreen {...defaultProps} />
    </UserProvider>
  );
}

describe('MatchesHomepageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVnAdminTree.mockResolvedValue({ provinces: [] });
    mockGetErrorMessage.mockImplementation((err) => (err instanceof Error ? err.message : 'Something went wrong.'));
  });

  it('shows a loading spinner, then the match list once listMatches resolves', async () => {
    mockListMatches.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('match-card-1')).toBeTruthy());
    expect(mockListMatches).toHaveBeenCalledWith(expect.objectContaining({ sport: 'FOOTBALL' }));
  });

  it('shows the empty state when no matches are returned', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    renderScreen();
    await waitFor(() => expect(screen.getByText(/No matches found/)).toBeTruthy());
  });

  it('shows an ErrorBanner with retry when listMatches rejects', async () => {
    mockListMatches.mockRejectedValue(new Error('Network down'));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Network down')).toBeTruthy());

    mockListMatches.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    fireEvent.press(screen.getByText('Try Again'));
    await waitFor(() => expect(screen.getByTestId('match-card-1')).toBeTruthy());
  });

  it('re-fetches with sport=BADMINTON when the sport toggle is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    renderScreen();
    await waitFor(() => expect(mockListMatches).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByTestId('sport-toggle-badminton'));
    await waitFor(() =>
      expect(mockListMatches).toHaveBeenLastCalledWith(expect.objectContaining({ sport: 'BADMINTON' }))
    );
  });

  it('calls setFavorite (optimistic toggle) when a card favorite icon is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [buildMatch({ isFavorited: false })], total: 1 });
    mockSetFavorite.mockResolvedValue({ isFavorited: true });
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('match-favorite-1')).toBeTruthy());

    fireEvent.press(screen.getByTestId('match-favorite-1'));
    await waitFor(() => expect(mockSetFavorite).toHaveBeenCalledWith(1, true));
  });

  it('calls onOpenMap when the map button is pressed', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    renderScreen();
    await waitFor(() => expect(mockListMatches).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('matches-map-button'));
    expect(defaultProps.onOpenMap).toHaveBeenCalledTimes(1);
  });

  it('opens the FAB speed-dial and calls onManageMatches for the Matches tab', async () => {
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    renderScreen();
    await waitFor(() => expect(mockListMatches).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('matches-fab'));
    fireEvent.press(screen.getByTestId('fab-action-manage-matches'));
    expect(defaultProps.onManageMatches).toHaveBeenCalledTimes(1);
  });
});
