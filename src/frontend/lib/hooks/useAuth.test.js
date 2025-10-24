import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider } from '../../contexts/AuthContext';
import useAuth from './useAuth';
import apiClient from '../api-client';

jest.mock('../api-client');

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {
  it('should handle successful login', async () => {
    const mockUser = { id: '1', display_name: 'Test User' };
    apiClient.get.mockResolvedValue({ user: mockUser });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login();
    });

    await waitForNextUpdate();

    expect(result.current.user).toEqual(mockUser);
  });
});
