import { renderHook, act } from '@testing-library/react-hooks';
import useSpotify from './useSpotify';
import apiClient from '../api-client';

jest.mock('../api-client');
jest.useFakeTimers();

describe('useSpotify', () => {
  it('should rate limit API calls', async () => {
    apiClient.get.mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() => useSpotify());

    act(() => {
      result.current.search('test', 'track');
      result.current.search('test', 'track');
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
