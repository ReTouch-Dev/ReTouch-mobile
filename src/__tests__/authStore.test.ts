import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { UnauthorizedError } from '../api/client';

jest.mock('expo-secure-store');
jest.mock('../api/auth');
jest.mock('../api/client', () => ({
  ...jest.requireActual('../api/client'),
  request: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
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
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('fetches user and sets authenticated when token exists', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('stored-token');
    mockAuthApi.me.mockResolvedValue(MOCK_USER);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.isLoading).toBe(false);
  });

  it('attempts refresh on 401 then sets user if refresh succeeds', async () => {
    mockSecureStore.getItemAsync
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
    mockSecureStore.getItemAsync.mockResolvedValue('expired-token');
    mockAuthApi.me.mockRejectedValue(new UnauthorizedError());
    mockAuthApi.refresh.mockRejectedValue(new Error('refresh expired'));

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.hydrate());

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });
});

describe('authStore.login', () => {
  it('saves tokens and sets user on success', async () => {
    mockAuthApi.login.mockResolvedValue(MOCK_AUTH_RESPONSE);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.login('test@example.com', 'password123'));

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'access-token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'refresh-token');
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

  it('logs the user in instead of re-registering when the email already exists and password matches', async () => {
    mockAuthApi.checkEmailAvailability.mockResolvedValue({ available: false });
    mockAuthApi.login.mockResolvedValue(MOCK_AUTH_RESPONSE);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.register('test@example.com', 'password123', 'Test User'));

    expect(mockAuthApi.register).not.toHaveBeenCalled();
    expect(mockAuthApi.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('throws a duplicate-email error without calling register when the email already exists and login fails', async () => {
    mockAuthApi.checkEmailAvailability.mockResolvedValue({ available: false });
    mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuthStore());

    await expect(
      act(() => result.current.register('test@example.com', 'wrongpass123', 'Test User')),
    ).rejects.toThrow('User with this email already exists');
    expect(mockAuthApi.register).not.toHaveBeenCalled();
  });
});

describe('authStore.logout', () => {
  it('clears tokens and user', async () => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
    mockAuthApi.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.logout());

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('still clears tokens if server logout call fails', async () => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
    mockAuthApi.logout.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuthStore());
    await act(() => result.current.logout());

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('authStore.refreshToken', () => {
  it('returns true and saves new token on success', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('refresh-token');
    mockAuthApi.refresh.mockResolvedValue({ access_token: 'new-access' });

    const { result } = renderHook(() => useAuthStore());
    let refreshed: boolean = false;
    await act(async () => {
      refreshed = await result.current.refreshToken();
    });

    expect(refreshed).toBe(true);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-access');
  });

  it('returns false when no refresh token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    let refreshed: boolean = true;
    await act(async () => {
      refreshed = await result.current.refreshToken();
    });

    expect(refreshed).toBe(false);
  });
});
