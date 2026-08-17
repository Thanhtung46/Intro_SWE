import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import MatchDetailScreen from './MatchDetailScreen';
import { UserProvider } from '@/context/UserContext';
import { getErrorMessage, getMatchDetail, setFavorite } from '@/services/matchService';
import type { Match, MatchDetail } from '@/types/match';

jest.mock('@/services/matchService');

const mockGetMatchDetail = getMatchDetail as jest.MockedFunction<typeof getMatchDetail>;
const mockSetFavorite = setFavorite as jest.MockedFunction<typeof setFavorite>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<typeof getErrorMessage>;

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 7,
    hostUserId: 101,
    hostFullName: 'Alex Nguyen',
    host: { userId: 101, fullName: 'Alex Nguyen', avatarUrl: null, matchCount: 120, rating: null },
    coverUrl: null,
    isFavorited: false,
    participantAvatars: [],
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title: 'Friday Night 7v7 - Pro League',
    notes: 'Bring turf shoes.',
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

function buildDetail(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return {
    match: buildMatch(),
    canJoin: true,
    yourRequest: null,
    participants: [
      { userId: 101, fullName: 'Alex Nguyen', avatarUrl: null, role: 'HOST', heads: 1, guests: [] },
    ],
    ...overrides,
  };
}

const defaultProps = {
  matchId: 7,
  onBack: jest.fn(),
  onOpenMap: jest.fn(),
  onOpenHostProfile: jest.fn(),
};

describe('MatchDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetErrorMessage.mockImplementation((err) => (err instanceof Error ? err.message : 'Something went wrong.'));
  });

  it('shows a loading spinner, then match details once getMatchDetail resolves', async () => {
    mockGetMatchDetail.mockResolvedValue(buildDetail());
    render(
      <UserProvider>
        <MatchDetailScreen {...defaultProps} />
      </UserProvider>
    );
    await waitFor(() => expect(screen.getByText('Friday Night 7v7 - Pro League')).toBeTruthy());
    expect(mockGetMatchDetail).toHaveBeenCalledWith(7);
    expect(screen.getByText('Squad (10/14)')).toBeTruthy();
  });

  it('shows an ErrorBanner with retry when getMatchDetail rejects', async () => {
    mockGetMatchDetail.mockRejectedValue(new Error('Match not found.'));
    render(
      <UserProvider>
        <MatchDetailScreen {...defaultProps} />
      </UserProvider>
    );
    await waitFor(() => expect(screen.getByText('Match not found.')).toBeTruthy());
  });

  it('calls onOpenHostProfile with the host userId when the host card is pressed', async () => {
    mockGetMatchDetail.mockResolvedValue(buildDetail());
    render(
      <UserProvider>
        <MatchDetailScreen {...defaultProps} />
      </UserProvider>
    );
    await waitFor(() => expect(screen.getByTestId('match-detail-host-card')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-detail-host-card'));
    expect(defaultProps.onOpenHostProfile).toHaveBeenCalledWith(101);
  });

  it('calls setFavorite (optimistic toggle) when the favorite icon is pressed', async () => {
    mockGetMatchDetail.mockResolvedValue(buildDetail());
    mockSetFavorite.mockResolvedValue({ isFavorited: true });
    render(
      <UserProvider>
        <MatchDetailScreen {...defaultProps} />
      </UserProvider>
    );
    await waitFor(() => expect(screen.getByTestId('match-detail-favorite')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-detail-favorite'));
    await waitFor(() => expect(mockSetFavorite).toHaveBeenCalledWith(7, true));
  });

  it('disables the Join Match button when canJoin is false', async () => {
    mockGetMatchDetail.mockResolvedValue(buildDetail({ canJoin: false }));
    render(
      <UserProvider>
        <MatchDetailScreen {...defaultProps} />
      </UserProvider>
    );
    await waitFor(() => expect(screen.getByTestId('match-detail-join')).toBeTruthy());
    expect(screen.getByTestId('match-detail-join').props.accessibilityState?.disabled).toBe(true);
  });
});
