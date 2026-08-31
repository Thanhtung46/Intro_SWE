import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import LoginScreen from '../app/auth/login';
import { UserProvider } from '../src/context/UserContext';
import * as authService from '../src/services/authService';

function renderLoginScreen() {
  return render(
    <UserProvider>
      <LoginScreen />
    </UserProvider>
  );
}

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSetToken = jest.fn();
const mockSetRefreshToken = jest.fn();

jest.mock('../src/utils/authStorage', () => ({
  setToken: (...args: unknown[]) => mockSetToken(...args),
  setRefreshToken: (...args: unknown[]) => mockSetRefreshToken(...args),
}));

jest.mock('../src/services/authService', () => ({
  login: jest.fn(),
}));

const mockLogin = authService.login as jest.MockedFunction<typeof authService.login>;

function fillValidForm(
  getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText'],
  email: string,
  password = 'Abcdef1!'
) {
  fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
  fireEvent.changeText(getByPlaceholderText('Enter your password'), password);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockSetToken.mockClear();
    mockSetRefreshToken.mockClear();
    mockLogin.mockReset();
    mockSetToken.mockResolvedValue(undefined);
    mockSetRefreshToken.mockResolvedValue(undefined);
  });

  it('shows a 401 invalid-credentials error with attempts remaining', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Invalid email or password',
      attemptsRemaining: 4,
    });

    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'someone@example.com', 'wrongpass');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Invalid email or password (4 attempt(s) remaining)')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the locked-account message on a 403 locked response', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Account is locked. Please contact support.',
    });

    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'locked@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Account is locked. Please contact support.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the pending-approval message on a 403 pending response', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Account is pending approval and cannot log in yet.',
    });

    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'pending@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Account is pending approval and cannot log in yet.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a friendly message (not the raw backend text) when the role has not been selected yet', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Please finish setting up your account before logging in.',
    });

    const { getByPlaceholderText, getByText, getByTestId, queryByText } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'noselectrole@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Please finish setting up your account before logging in.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(queryByText('Please select your role to continue.')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('stores the tokens and navigates to /home on a successful login', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { role: 'PLAYER', email: 'new-user@example.com' },
    });

    const { getByPlaceholderText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'new-user@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(mockPush).toHaveBeenCalledWith({ pathname: '/home', params: { role: 'PLAYER' } }),
      { timeout: 3000 }
    );
    expect(mockSetToken).toHaveBeenCalledWith('mock-access-token');
    expect(mockSetRefreshToken).toHaveBeenCalledWith('mock-refresh-token');
  });

  it('does not navigate when saving the session fails', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { role: 'PLAYER' },
    });
    mockSetToken.mockRejectedValueOnce(new Error('SecureStore unavailable'));

    const { getByPlaceholderText, getByTestId, getByText } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'new-user@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Could not save session. Please try again.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows validation errors under fields (not an alert) when submitted empty', async () => {
    const { getByText, getByTestId, queryByText } = renderLoginScreen();

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => expect(getByText('Email is required')).toBeTruthy());
    expect(getByText('Password is required')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(queryByText('Something went wrong. Please try again.')).toBeNull();
  });

  it.each([
    ['footer-privacy', 'Privacy Policy'],
    ['footer-terms', 'Terms of Service'],
    ['footer-help', 'Help Center'],
  ])('shows a "Coming soon" alert when the %s footer link is pressed', async (testId, label) => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderLoginScreen();

    fireEvent.press(getByTestId(testId));

    expect(alertSpy).toHaveBeenCalledWith('Coming soon', `${label} is not available yet.`);
    alertSpy.mockRestore();
  });
});
