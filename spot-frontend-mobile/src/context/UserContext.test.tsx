import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { UserProvider, useUser } from './UserContext';

function Consumer() {
  const { user, setUser, clearUser } = useUser();
  return (
    <>
      <Text testID="user-name">{user?.fullName || 'none'}</Text>
      <TouchableOpacity
        testID="set-user"
        onPress={() => setUser({ fullName: 'Vonws Jr', email: 'vonws.jr@email.com' })}
      >
        <Text>set</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="clear-user" onPress={clearUser}>
        <Text>clear</Text>
      </TouchableOpacity>
    </>
  );
}

describe('UserContext', () => {
  it('starts with no user', () => {
    const { getByTestId } = render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );
    expect(getByTestId('user-name').props.children).toBe('none');
  });

  it('setUser stores the user and clearUser resets it', () => {
    const { getByTestId } = render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );

    fireEvent.press(getByTestId('set-user'));
    expect(getByTestId('user-name').props.children).toBe('Vonws Jr');

    fireEvent.press(getByTestId('clear-user'));
    expect(getByTestId('user-name').props.children).toBe('none');
  });

  it('throws when useUser is called outside a UserProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useUser must be used within a UserProvider');
    spy.mockRestore();
  });
});
