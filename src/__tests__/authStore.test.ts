import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { UnauthorizedError } from '../api/client';
import * as sessionStorage from '../lib/sessionStorage';

jest.mock('../api/auth');
jest.mock('../lib/sessionStorage');
jest.mock('../api/client', () => ({
  ...jest.requireActual('../api/client'),
  request: jest.fn(),
}));

const mockSessionStorage = sessionStorage as jest.Mocked<typeof sessionStorage>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

const MOCK_USER = { id: 1, email: 'test@example.com', full_name: 'Test User', is_active: true, is_verified: true };
const MOCK_AUTH_RESPONSE = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: MOCK_USER,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store state between tests
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
});

describe('authStore.hydrate', () => {
  it('sets unauthenticated when no token stored', async () => {
    mockSessionStorage.getSessionItem.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('fetches user and sets authenticated when token exists', async () => {
    mockSessionStorage.getSessionItem.mockResolvedValue('stored-token');
    mockAuthApi.me.mockResolvedValue(MOCK_USER);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.isLoading).toBe(false);
  });

  it('attempts refresh on 401 then sets user if refresh succeeds', async () => {
    mockSessionStorage.getSessionItem
      .mockResolvedValueOnce('old-access-token') // access_token check
      .mockResolvedValueOnce('refresh-token');   // refresh_token check in refreshToken()
    mockAuthApi.me
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(MOCK_USER);
    mockAuthApi.refresh.mockResolvedValue({ access_token: 'new-access-token' });

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
  });

  it('clears tokens and sets unauthenticated if refresh fails', async () => {
    mockSessionStorage.getSessionItem.mockResolvedValue('expired-token');
    mockAuthApi.me.mockRejectedValue(new UnauthorizedError());
    mockAuthApi.refresh.mockRejectedValue(new Error('refresh expired'));

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockSessionStorage.deleteSessionItem).toHaveBeenCalledWith('access_token');
    expect(mockSessionStorage.deleteSessionItem).toHaveBeenCalledWith('refresh_token');
  });
});

describe('authStore.login', () => {
  it('saves tokens and sets user on success', async () => {
    mockAuthApi.login.mockResolvedValue(MOCK_AUTH_RESPONSE);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.login('test@example.com', 'password123'));

    expect(mockSessionStorage.setSessionItem).toHaveBeenCalledWith('access_token', 'access-token');
    expect(mockSessionStorage.setSessionItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_AUTH_RESPONSE.user);
  });

  it('propagates error on failed login', async () => {
    mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuthStore());
    await expect(act(() => result.current.login('bad@example.com', 'wrong'))).rejects.toThrow(
      'Invalid credentials',
    );
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('authStore.register', () => {
  it('saves tokens and sets user on success', async () => {
    mockAuthApi.checkEmailAvailability.mockResolvedValue({ available: true });
    mockAuthApi.register.mockResolvedValue(MOCK_AUTH_RESPONSE);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.register('new@example.com', 'pass', 'New User'));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('throws a duplicate-email error without calling register when the email already exists', async () => {
    mockAuthApi.checkEmailAvailability.mockResolvedValue({ available: false });

    const { result } = renderHook(() => useAuthStore());

    await expect(
      act(() => result.current.register('test@example.com', 'wrongpass123', 'Test User')),
    ).rejects.toThrow('User with this email already exists');
    expect(mockAuthApi.register).not.toHaveBeenCalled();
    expect(mockAuthApi.login).not.toHaveBeenCalled();
  });
});

describe('authStore.logout', () => {
  it('clears tokens and user', async () => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
    mockAuthApi.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.logout());

    expect(mockSessionStorage.deleteSessionItem).toHaveBeenCalledWith('access_token');
    expect(mockSessionStorage.deleteSessionItem).toHaveBeenCalledWith('refresh_token');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('still clears tokens if server logout call fails', async () => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
    mockAuthApi.logout.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.logout());

    expect(mockSessionStorage.deleteSessionItem).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('authStore.refreshToken', () => {
  it('returns true and saves new token on success', async () => {
    mockSessionStorage.getSessionItem.mockResolvedValue('refresh-token');
    mockAuthApi.refresh.mockResolvedValue({ access_token: 'new-access' });

    const { result } = renderHook(() => useAuthStore());
    let refreshed: boolean = false;
    await act(async () => {
      refreshed = await result.current.refreshToken();
    });

    expect(refreshed).toBe(true);
    expect(mockSessionStorage.setSessionItem).toHaveBeenCalledWith('access_token', 'new-access');
  });

  it('returns false when no refresh token stored', async () => {
    mockSessionStorage.getSessionItem.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    let refreshed: boolean = true;
    await act(async () => {
      refreshed = await result.current.refreshToken();
    });

    expect(refreshed).toBe(false);
  });
});
