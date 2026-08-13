import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import LoginScreen from '../app/auth/login';
import { UserProvider } from '../src/context/UserContext';

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

const mockSetItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
}));

function fillValidForm(
  getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText'],
  email: string,
  password = 'Abcdef1!'
) {
  fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
  fireEvent.changeText(getByPlaceholderText('Enter your password'), password);
}

describe('LoginScreen (mocked authService via USE_MOCK_API)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockSetItemAsync.mockClear();
  });

  it('shows a 401 invalid-credentials error with attempts remaining', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'someone@example.com', 'wrongpass');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Invalid email or password (4 attempt(s) remaining)')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('shows the locked-account message on a 403 locked response', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'locked@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Account is locked. Please contact support.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('shows the pending-approval message on a 403 pending response', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'pending@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Account is pending approval and cannot log in yet.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('shows a friendly message (not the raw backend text) when the role has not been selected yet', async () => {
    const { getByPlaceholderText, getByText, getByTestId, queryByText } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'noselectrole@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(getByText('Please finish setting up your account before logging in.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(queryByText('Please select your role to continue.')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('stores the tokens and navigates to /home on a successful login', async () => {
    const { getByPlaceholderText, getByTestId } = renderLoginScreen();
    fillValidForm(getByPlaceholderText, 'new-user@example.com');

    fireEvent.press(getByTestId('login-button'));

    await waitFor(
      () => expect(mockPush).toHaveBeenCalledWith({ pathname: '/home', params: { role: 'PLAYER' } }),
      { timeout: 3000 }
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith('accessToken', 'mock-access-token');
    expect(mockSetItemAsync).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
  }, 10000);

  it('shows validation errors under fields (not an alert) when submitted empty', async () => {
    const { getByText, getByTestId, queryByText } = renderLoginScreen();

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => expect(getByText('Email is required')).toBeTruthy());
    expect(getByText('Password is required')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(queryByText('Something went wrong. Please try again.')).toBeNull();
  });

  it('shows a "Coming soon" alert when Login with Google is pressed, without calling authService', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderLoginScreen();

    fireEvent.press(getByTestId('google-login-button'));

    expect(alertSpy).toHaveBeenCalledWith('Coming soon', 'Login with Google is not available yet.');
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
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
