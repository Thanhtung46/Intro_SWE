import React, { createContext, useContext, useState } from 'react';
import { LoginUser } from '../services/authService';

interface UserContextValue {
  user: LoginUser | null;
  setUser: (user: LoginUser | null) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginUser | null>(null);

  const clearUser = () => setUser(null);

  return <UserContext.Provider value={{ user, setUser, clearUser }}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
