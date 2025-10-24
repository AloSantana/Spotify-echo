import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LLMProvider, useLLM } from './LLMContext';
import apiClient from '../lib/api-client';

jest.mock('../lib/api-client');

const TestComponent = () => {
  const { providers, currentProvider, sendMessage } = useLLM();
  return (
    <div>
      <div data-testid="providers">{JSON.stringify(providers)}</div>
      <div data-testid="currentProvider">{currentProvider}</div>
      <button onClick={() => sendMessage('Hello')}>Send</button>
    </div>
  );
};

describe('LLMContext', () => {
  it('should handle sending a message', async () => {
    apiClient.post.mockResolvedValue({ success: true, response: 'Hi there!' });
    apiClient.get.mockResolvedValue({ providers: { 'test-provider': { name: 'Test Provider', status: 'available' } } });

    render(
      <LLMProvider>
        <TestComponent />
      </LLMProvider>
    );

    await act(async () => {
      screen.getByText('Send').click();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/llm/send', { message: 'Hello', context: expect.any(Object) });
  });
});
