import { renderHook, act } from '@testing-library/react-hooks';
import useSessionStorage from './useSessionStorage';

describe('useSessionStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('should set the initial value from sessionStorage if it exists', () => {
    window.sessionStorage.setItem('test-key', JSON.stringify('stored-value'));
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial-value'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('should use the initial value if sessionStorage is empty', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial-value'));
    expect(result.current[0]).toBe('initial-value');
  });

  it('should update the value in sessionStorage when the setter is called', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial-value'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(window.sessionStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });
});
