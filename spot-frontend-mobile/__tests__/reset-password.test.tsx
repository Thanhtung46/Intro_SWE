import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import ResetPasswordScreen from '../app/auth/reset-password';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({ email: 'someone@example.com' }),
}));

function fillValidPasswords(getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText']) {
  fireEvent.changeText(getByPlaceholderText('Enter new password'), 'Abcdef1!');
  fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'Abcdef1!');
}

describe('ResetPasswordScreen (mocked authService via USE_MOCK_API)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
  });

  it('shows validation errors under fields when submitted empty', async () => {
    const { getByText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(() => expect(getByText('OTP must be exactly 6 digits')).toBeTruthy());
    expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    expect(getByText('Confirm your password')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a mismatch error when confirmPassword does not match newPassword', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByTestId('otp-input-0'), '111111');
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'Abcdef1!');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'Different1!');
    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(() => expect(getByText('Passwords do not match')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows an "Invalid or expired OTP" error with attempts remaining for a wrong OTP', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByTestId('otp-input-0'), '222222');
    fillValidPasswords(getByPlaceholderText);
    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(
      () => expect(getByText('Invalid or expired OTP (4 attempt(s) remaining)')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockReplace).not.toHaveBeenCalled();
  }, 10000);

  it('shows a success alert and navigates to /auth/login on OTP "111111"', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.[0]?.onPress?.();
    });
    const { getByPlaceholderText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByTestId('otp-input-0'), '111111');
    fillValidPasswords(getByPlaceholderText);
    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    alertSpy.mockRestore();
  }, 10000);
});
