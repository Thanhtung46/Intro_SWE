import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import CheckProfileScreen from './CheckProfileScreen';
import { getErrorMessage, getHostProfile, listMatches } from '@/services/matchService';
import type { HostProfile, Match } from '@/types/match';

jest.mock('@/services/matchService');

const mockGetHostProfile = getHostProfile as jest.MockedFunction<typeof getHostProfile>;
const mockListMatches = listMatches as jest.MockedFunction<typeof listMatches>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<typeof getErrorMessage>;

function buildProfile(overrides: Partial<HostProfile> = {}): HostProfile {
  return {
    userId: 101,
    fullName: 'Vonws Jr',
    avatarUrl: null,
    createdAt: '2026-07-18T00:00:00.000Z',
    skills: { football: 'PROFESSIONAL', badminton: null },
    matchCount: 10,
    rating: null,
    reviewCount: 0,
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 3,
    hostUserId: 101,
    // Deliberately different from the profile's fullName ("Vonws Jr") so the
    // card's host-row text doesn't collide with the profile identity text.
    hostFullName: 'Vonws Jr (host)',
    host: { userId: 101, fullName: 'Vonws Jr (host)', avatarUrl: null, matchCount: 10, rating: null },
    coverUrl: null,
    isFavorited: false,
    participantAvatars: [],
    sport: 'BADMINTON',
    format: 'DOUBLES',
    title: 'GMT Group Evening Badminton',
    notes: null,
    venueName: 'Skyline Arena',
    venueAddress: 'District 2, Ho Chi Minh City',
    latitude: 10.7869,
    longitude: 106.7498,
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    isMultiDay: false,
    isRecurring: false,
    maxPlayers: 4,
    filledCount: 1,
    spotsLeft: 3,
    squad: { filled: 1, max: 4 },
    skillMin: 'BEGINNER_MINUS',
    skillMax: 'BEGINNER_PLUS',
    allLevels: false,
    feeType: 'GENDER_RANGE',
    priceMin: 40000,
    priceMax: 45000,
    yourShare: null,
    joinMode: 'APPROVAL',
    status: 'OPEN',
    courtCount: 1,
    courts: [{ courtId: 3, name: null, sortOrder: 1 }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = { hostUserId: 101, onBack: jest.fn(), onOpenMatch: jest.fn() };

describe('CheckProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetErrorMessage.mockImplementation((err) => (err instanceof Error ? err.message : 'Something went wrong.'));
  });

  it('renders profile stats + hosted matches once both calls resolve', async () => {
    mockGetHostProfile.mockResolvedValue(buildProfile());
    mockListMatches.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    render(<CheckProfileScreen {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Vonws Jr')).toBeTruthy());
    expect(screen.getByText('10')).toBeTruthy(); // Hosted Matches stat
    expect(screen.getByText('GMT Group Evening Badminton')).toBeTruthy();
    expect(mockListMatches).toHaveBeenCalledWith({ hostUserId: 101 });
  });

  it('never shows Verified badge, rating, or Reviews (plan mục 2.3 — not a TODO)', async () => {
    mockGetHostProfile.mockResolvedValue(buildProfile());
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<CheckProfileScreen {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Vonws Jr')).toBeTruthy());
    expect(screen.queryByText(/VERIFIED/i)).toBeNull();
    expect(screen.queryByText(/Reviews/i)).toBeNull();
    expect(screen.queryByText(/Groups/i)).toBeNull();
  });

  it('shows the empty-hosted-matches card when there are none', async () => {
    mockGetHostProfile.mockResolvedValue(buildProfile({ matchCount: 0 }));
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<CheckProfileScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('No active hosted matches.')).toBeTruthy());
  });

  it('shows an ErrorBanner with retry when getHostProfile rejects', async () => {
    mockGetHostProfile.mockRejectedValue(new Error('User not found.'));
    mockListMatches.mockResolvedValue({ matches: [], total: 0 });
    render(<CheckProfileScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('User not found.')).toBeTruthy());
  });

  it('calls onOpenMatch when a hosted match card is pressed', async () => {
    mockGetHostProfile.mockResolvedValue(buildProfile());
    mockListMatches.mockResolvedValue({ matches: [buildMatch()], total: 1 });
    render(<CheckProfileScreen {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('match-card-3')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-card-3'));
    expect(defaultProps.onOpenMatch).toHaveBeenCalledWith(3);
  });
});
