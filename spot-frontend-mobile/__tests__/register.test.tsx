import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import RegisterScreen from '../app/auth/register';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

function fillValidForm(getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText'], email: string) {
  fireEvent.changeText(getByPlaceholderText('Enter full name'), 'Nguyen Van A');
  fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
  fireEvent.changeText(getByPlaceholderText('Min 8 chars, incl. A-Z, 0-9, symbol'), 'Abcdef1!');
  fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Abcdef1!');
}

describe('RegisterScreen (mocked authService via USE_MOCK_API)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
  });

  it('shows the email-taken error under the Email field, not a generic alert', async () => {
    const { getByPlaceholderText, getByText, getByTestId, queryByText } = render(<RegisterScreen />);
    fillValidForm(getByPlaceholderText, 'taken@example.com');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => expect(getByText('Email đã được sử dụng')).toBeTruthy(), { timeout: 3000 });
    expect(mockPush).not.toHaveBeenCalled();
    expect(queryByText('Something went wrong. Please try again.')).toBeNull();
  }, 10000);

  it('shows a network-error message when the request fails to reach the server', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
    fillValidForm(getByPlaceholderText, 'network@example.com');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(
      () => expect(getByText('Network error. Please check your connection and try again.')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('shows a 400 field validation error under the matching field, mapped from the backend field name', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
    fillValidForm(getByPlaceholderText, 'invalid-phone@example.com');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(
      () => expect(getByText('Phone number must be 10–15 digits (optional leading +)')).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);

  it('navigates to /auth/choose-role (register step 2) on a successful registration', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
    fillValidForm(getByPlaceholderText, 'new-user@example.com');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(
      () =>
        expect(mockPush).toHaveBeenCalledWith({
          pathname: '/auth/choose-role',
          params: { email: 'new-user@example.com' },
        }),
      { timeout: 3000 }
    );
  }, 10000);

  it('shows validation errors under fields (not an alert) when submitted empty', async () => {
    const { getByText, getByTestId, queryByText } = render(<RegisterScreen />);

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => expect(getByText('Name is required')).toBeTruthy());
    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(queryByText('Something went wrong. Please try again.')).toBeNull();
  });
});
