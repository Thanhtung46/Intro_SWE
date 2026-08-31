import { fireEvent, render } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import ProfileScreen from '../app/profile';
import { LoginUser } from '../src/services/authService';
import { UserProvider, useUser } from '../src/context/UserContext';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

function Preset({ user }: { user?: LoginUser }) {
  const { setUser } = useUser();
  useEffect(() => {
    if (user) setUser(user);
  }, [user]);
  return <ProfileScreen />;
}

function renderProfile(user?: LoginUser) {
  return render(
    <UserProvider>
      <Preset user={user} />
    </UserProvider>
  );
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
  });

  it('falls back to "Guest" when no user is in context', () => {
    const { getByTestId } = renderProfile();
    expect(getByTestId('profile-name').props.children).toBe('Guest');
  });

  it("shows the logged-in user's name from context", () => {
    const { getByTestId } = renderProfile({ fullName: 'Vonws Jr', email: 'vonws.jr@email.com' });
    expect(getByTestId('profile-name').props.children).toBe('Vonws Jr');
  });

  it('renders empty states for Groups/Favorites/Hosted Matches/Reviews', () => {
    const { getByText } = renderProfile();
    expect(getByText('No favorite matches yet')).toBeTruthy();
    expect(getByText('No active matches')).toBeTruthy();
    expect(getByText('No reviews yet')).toBeTruthy();
  });

  it('calls router.back() when the back button is pressed', () => {
    const { getByTestId } = renderProfile();
    fireEvent.press(getByTestId('profile-back-button'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates to the Edit Profile screen when Edit is pressed', () => {
    const { getByTestId } = renderProfile();
    fireEvent.press(getByTestId('profile-edit-button'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('switches the active Favorites tab without changing the empty state', () => {
    const { getByTestId, getByText } = renderProfile();
    fireEvent.press(getByTestId('favorites-tab-Venues'));
    expect(getByText('No favorite matches yet')).toBeTruthy();
  });
});
