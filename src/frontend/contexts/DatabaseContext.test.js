import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DatabaseProvider, useDatabase } from './DatabaseContext';
import apiClient from '../lib/api-client';

jest.mock('../lib/api-client');

const TestComponent = () => {
  const { dbStatus, connect, disconnect } = useDatabase();
  return (
    <div>
      <div data-testid="dbStatus">{dbStatus}</div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
};

describe('DatabaseContext', () => {
  it('should handle connect and disconnect', async () => {
    apiClient.post.mockResolvedValue({ status: 'connected' });

    render(
      <DatabaseProvider>
        <TestComponent />
      </DatabaseProvider>
    );

    await act(async () => {
      screen.getByText('Connect').click();
    });

    expect(screen.getByTestId('dbStatus')).toHaveTextContent('connected');

    apiClient.post.mockResolvedValue({ status: 'disconnected' });

    await act(async () => {
      screen.getByText('Disconnect').click();
    });

    expect(screen.getByTestId('dbStatus')).toHaveTextContent('disconnected');
  });
});
