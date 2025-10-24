import { renderHook, act } from '@testing-library/react-hooks';
import useApi from './useApi';
import apiClient from '../api-client';

jest.mock('../api-client');

describe('useApi', () => {
  it('should handle successful API calls', async () => {
    const mockData = { message: 'Success' };
    apiClient.get.mockResolvedValue(mockData);

    const { result, waitForNextUpdate } = renderHook(() => useApi());

    act(() => {
      result.current.request(() => apiClient.get('/test'));
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle API call errors', async () => {
    const mockError = { message: 'Error' };
    apiClient.get.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useApi());

    act(() => {
      result.current.request(() => apiClient.get('/test'));
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });
});
