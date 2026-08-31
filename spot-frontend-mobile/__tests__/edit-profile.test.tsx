import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import EditProfileScreen from '../app/profile/edit';
import { LoginUser } from '../src/services/authService';
import * as authService from '../src/services/authService';
import { UserProvider, useUser } from '../src/context/UserContext';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('../src/services/authService', () => ({
  forgotPassword: jest.fn(),
}));

const mockForgotPassword = authService.forgotPassword as jest.MockedFunction<typeof authService.forgotPassword>;

function Preset({ user }: { user?: LoginUser }) {
  const { setUser } = useUser();
  useEffect(() => {
    if (user) setUser(user);
  }, [user]);
  return <EditProfileScreen />;
}

function renderEditProfile(user?: LoginUser) {
  return render(
    <UserProvider>
      <Preset user={user} />
    </UserProvider>
  );
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockForgotPassword.mockReset();
  });

  it('blocks save and shows an inline error when Name is empty', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getByText } = renderEditProfile({ fullName: '', email: 'a@b.com' });

    fireEvent.press(getByTestId('edit-profile-save'));

    expect(getByText('Name is required')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('saves a valid Name into UserContext and navigates back', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderEditProfile({ fullName: 'Old Name', email: 'a@b.com' });

    fireEvent.changeText(getByTestId('edit-profile-name-input'), 'New Name');
    fireEvent.press(getByTestId('edit-profile-save'));

    expect(alertSpy).toHaveBeenCalledWith('Success', 'Profile updated');
    expect(mockBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('renders Email and Phone Number as disabled', () => {
    const { getByTestId } = renderEditProfile({
      fullName: 'Vonws Jr',
      email: 'vonws.jr@email.com',
      phoneNumber: '0900000000',
    });

    expect(getByTestId('edit-profile-email-input').props.editable).toBe(false);
    expect(getByTestId('edit-profile-email-input').props.value).toBe('vonws.jr@email.com');
    expect(getByTestId('edit-profile-phone-input').props.editable).toBe(false);
    expect(getByTestId('edit-profile-phone-input').props.value).toBe('0900000000');
  });

  it('shows "Coming soon" when the avatar upload badge is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderEditProfile();

    fireEvent.press(getByTestId('edit-profile-avatar-upload'));

    expect(alertSpy).toHaveBeenCalledWith('Coming soon', 'Photo upload is not available yet.');
    alertSpy.mockRestore();
  });

  it('sends an OTP to the user\'s email and navigates to the OTP screen when Change Password succeeds', async () => {
    mockForgotPassword.mockResolvedValue({ success: true });
    const { getByTestId } = renderEditProfile({ fullName: 'A', email: 'a@b.com' });

    fireEvent.press(getByTestId('edit-profile-change-password'));

    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('a@b.com'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/auth/forgot-password-otp',
      params: { email: 'a@b.com' },
    });
  });

  it('shows an error alert and does not navigate when sending the OTP fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockForgotPassword.mockResolvedValue({ success: false, message: 'Network error. Please check your connection and try again.' });
    const { getByTestId } = renderEditProfile({ fullName: 'A', email: 'a@b.com' });

    fireEvent.press(getByTestId('edit-profile-change-password'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Network error. Please check your connection and try again.')
    );
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('calls router.back() when the close button is pressed', () => {
    const { getByTestId } = renderEditProfile();
    fireEvent.press(getByTestId('edit-profile-close'));
    expect(mockBack).toHaveBeenCalled();
  });
});
