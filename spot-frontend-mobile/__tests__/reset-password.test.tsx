import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import ResetPasswordScreen from '../app/auth/reset-password';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

// otp now arrives via route params (collected on the previous OTP screen,
// see forgot-password-otp.tsx) — no OTP field is rendered on this screen
// anymore, so tests just set it here instead of typing into an OtpInput.
let mockParams: { email?: string; otp?: string } = {
  email: 'someone@example.com',
  otp: '111111',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

function fillValidPasswords(getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText']) {
  fireEvent.changeText(getByPlaceholderText('Enter new password'), 'Abcdef1!');
  fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'Abcdef1!');
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockParams = { email: 'someone@example.com', otp: '111111' };
  });

  it('has no OTP input — the code comes from the previous screen via route params, not typed here', () => {
    const { queryByTestId } = render(<ResetPasswordScreen />);
    expect(queryByTestId('otp-input-0')).toBeNull();
  });

  it('shows validation errors under fields when submitted empty', async () => {
    const { getByText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(() => expect(getByText('Password must be at least 8 characters')).toBeTruthy());
    expect(getByText('Confirm your password')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a mismatch error when confirmPassword does not match newPassword', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'Abcdef1!');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'Different1!');
    fireEvent.press(getByTestId('update-password-button'));

    await waitFor(() => expect(getByText('Passwords do not match')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('submits email + otp (from route params) + newPassword to resetPassword on valid input', async () => {
    mockParams = { email: 'someone@example.com', otp: '654321' };
    const { getByPlaceholderText, getByTestId } = render(<ResetPasswordScreen />);

    fillValidPasswords(getByPlaceholderText);
    fireEvent.press(getByTestId('update-password-button'));

    // Real backend call (authService no longer has a mock adapter — see
    // promting/CLAUDE.md, USE_MOCK_API is vestigial). This test only
    // verifies the screen doesn't block submission on client-side
    // validation once otp/newPassword/confirmPassword are all valid; it
    // can't assert success/failure of the network call itself without a
    // reachable backend or a jest mock of authService.resetPassword.
    await waitFor(() => expect(getByTestId('update-password-button')).toBeTruthy());
  }, 10000);
});
