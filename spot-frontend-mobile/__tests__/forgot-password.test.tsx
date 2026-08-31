import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import ForgotPasswordScreen from '../app/auth/forgot-password';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ForgotPasswordScreen (mocked authService via USE_MOCK_API)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
  });

  it('shows a required-field error when submitted empty', async () => {
    const { getByText, getByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.press(getByTestId('send-otp-button'));

    await waitFor(() => expect(getByText('Email is required')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('always succeeds with the generic message and navigates to the OTP screen with the email', async () => {
    const { getByPlaceholderText, getByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('username@example.com'), 'someone@example.com');
    fireEvent.press(getByTestId('send-otp-button'));

    await waitFor(
      () =>
        expect(mockPush).toHaveBeenCalledWith({
          pathname: '/auth/forgot-password-otp',
          params: { email: 'someone@example.com' },
        }),
      { timeout: 3000 }
    );
  }, 10000);
});
