import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import MatchCard from './MatchCard';
import type { Match } from '@/types/match';

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
    startsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
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

describe('MatchCard', () => {
  it('renders title, host, and spots-left copy', () => {
    render(<MatchCard match={buildMatch()} onPress={jest.fn()} onToggleFavorite={jest.fn()} onShare={jest.fn()} />);
    expect(screen.getByText('Friday Night 7v7 - Pro League')).toBeTruthy();
    expect(screen.getByText('Alex Nguyen')).toBeTruthy();
    expect(screen.getByText('4 spots left')).toBeTruthy();
  });

  it('shows "Full" and disables the join button when spotsLeft is 0', () => {
    render(
      <MatchCard
        match={buildMatch({ spotsLeft: 0, status: 'FULL' })}
        onPress={jest.fn()}
        onToggleFavorite={jest.fn()}
        onShare={jest.fn()}
      />
    );
    expect(screen.getAllByText('Full').length).toBeGreaterThan(0);
    expect(screen.getByTestId('match-join-1').props.accessibilityState?.disabled).toBe(true);
  });

  it('calls onToggleFavorite when the heart icon is pressed, not onPress', () => {
    const onPress = jest.fn();
    const onToggleFavorite = jest.fn();
    render(<MatchCard match={buildMatch()} onPress={onPress} onToggleFavorite={onToggleFavorite} onShare={jest.fn()} />);
    fireEvent.press(screen.getByTestId('match-favorite-1'));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when the card body is pressed', () => {
    const onPress = jest.fn();
    render(<MatchCard match={buildMatch()} onPress={onPress} onToggleFavorite={jest.fn()} onShare={jest.fn()} />);
    fireEvent.press(screen.getByTestId('match-card-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onShare when the share icon is pressed', () => {
    const onShare = jest.fn();
    render(<MatchCard match={buildMatch()} onPress={jest.fn()} onToggleFavorite={jest.fn()} onShare={onShare} />);
    fireEvent.press(screen.getByTestId('match-share-1'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
