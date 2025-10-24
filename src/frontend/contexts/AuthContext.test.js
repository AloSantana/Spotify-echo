import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../lib/api-client';

jest.mock('../lib/api-client');

const TestComponent = () => {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.display_name : 'null'}</div>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  it('should handle login and logout', async () => {
    const mockUser = { id: '1', display_name: 'Test User' };
    apiClient.get.mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Test User');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });
});
