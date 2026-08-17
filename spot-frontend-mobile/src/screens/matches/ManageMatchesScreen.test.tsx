import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import ManageMatchesScreen from './ManageMatchesScreen';
import { getErrorMessage, listMine } from '@/services/matchService';
import type { Match } from '@/types/match';

jest.mock('@/services/matchService');

const mockListMine = listMine as jest.MockedFunction<typeof listMine>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<typeof getErrorMessage>;

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 5,
    hostUserId: 103,
    hostFullName: 'Vonws Jr',
    host: { userId: 103, fullName: 'Vonws Jr', avatarUrl: null, matchCount: 10, rating: null },
    coverUrl: null,
    isFavorited: false,
    participantAvatars: [],
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title: 'Sunday Kick-about',
    notes: null,
    venueName: 'Skyline Arena',
    venueAddress: 'District 2, Ho Chi Minh City',
    latitude: null,
    longitude: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    isMultiDay: false,
    isRecurring: false,
    maxPlayers: 14,
    filledCount: 1,
    spotsLeft: 13,
    squad: { filled: 1, max: 14 },
    skillMin: null,
    skillMax: null,
    allLevels: true,
    feeType: 'SPLIT_EVENLY',
    priceMin: 700000,
    priceMax: null,
    yourShare: 700000,
    joinMode: 'AUTO',
    status: 'OPEN',
    courtCount: 1,
    courts: [{ courtId: 5, name: null, sortOrder: 1 }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = { onBack: jest.fn(), onOpenMatch: jest.fn() };

describe('ManageMatchesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetErrorMessage.mockImplementation((err) => (err instanceof Error ? err.message : 'Something went wrong.'));
  });

  it('fetches the active tab by default', async () => {
    mockListMine.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    render(<ManageMatchesScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('match-card-5')).toBeTruthy());
    expect(mockListMine).toHaveBeenCalledWith({ tab: 'active' });
  });

  it('switches to the completed tab and re-fetches', async () => {
    mockListMine.mockResolvedValue({ matches: [], total: 0 });
    render(<ManageMatchesScreen {...defaultProps} />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalledWith({ tab: 'active' }));

    fireEvent.press(screen.getByTestId('manage-matches-tab-completed'));
    await waitFor(() => expect(mockListMine).toHaveBeenLastCalledWith({ tab: 'completed' }));
    expect(screen.getByText('No completed matches yet.')).toBeTruthy();
  });

  it('shows an ErrorBanner with retry when listMine rejects', async () => {
    mockListMine.mockRejectedValue(new Error('Could not load your matches.'));
    render(<ManageMatchesScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Could not load your matches.')).toBeTruthy());
  });

  it('calls onBack when the back button is pressed', async () => {
    mockListMine.mockResolvedValue({ matches: [], total: 0 });
    render(<ManageMatchesScreen {...defaultProps} />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('manage-matches-back'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenMatch when a match card is pressed', async () => {
    mockListMine.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    render(<ManageMatchesScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('match-card-5')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-card-5'));
    expect(defaultProps.onOpenMatch).toHaveBeenCalledWith(5);
  });
});
