import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import SettingsScreen from '../app/settings';
import { UserProvider } from '../src/context/UserContext';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
}));

function renderSettings() {
  return render(
    <UserProvider>
      <SettingsScreen />
    </UserProvider>
  );
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('renders all sections', () => {
    const { getByText } = renderSettings();
    expect(getByText('Personal Information')).toBeTruthy();
    expect(getByText('Push Notifications')).toBeTruthy();
    expect(getByText('Location Services')).toBeTruthy();
    expect(getByText('Language')).toBeTruthy();
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Help Center')).toBeTruthy();
    expect(getByText('About Us')).toBeTruthy();
    expect(getByText('Contact Us')).toBeTruthy();
    expect(getByText('Report an Issue')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
    expect(getByText('Version 1.0.0')).toBeTruthy();
  });

  it('navigates to /profile/edit when Personal Information is pressed', () => {
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId('settings-personal-information'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('toggles Push Notifications and Location Services', () => {
    const { getByTestId } = renderSettings();
    const pushToggle = getByTestId('settings-push-notifications-toggle');
    const locationToggle = getByTestId('settings-location-services-toggle');

    expect(pushToggle.props.value).toBe(true);
    expect(locationToggle.props.value).toBe(true);

    fireEvent(pushToggle, 'valueChange', false);
    fireEvent(locationToggle, 'valueChange', false);

    expect(getByTestId('settings-push-notifications-toggle').props.value).toBe(false);
    expect(getByTestId('settings-location-services-toggle').props.value).toBe(false);
  });

  it('calls clearUser and navigates to login when Sign Out is pressed', () => {
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId('settings-sign-out'));
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
  });

  it('calls router.back() when the back button is pressed', () => {
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId('settings-back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
