/**
 * Unit tests for authApi — every public method, both demo and real modes.
 */
import { authApi } from '../api/auth';
import * as client from '../api/client';
import * as demo from '../lib/demo';

jest.mock('../api/client');
jest.mock('../lib/sessionStorage', () => ({
  getSessionItem: jest.fn().mockResolvedValue(null),
  setSessionItem: jest.fn().mockResolvedValue(undefined),
  deleteSessionItem: jest.fn().mockResolvedValue(undefined),
}));

const mockRequest = client.request as jest.MockedFunction<typeof client.request>;

// ── helpers ─────────────────────────────────────────────────────────────────

const MOCK_AUTH_RESP = {
  access_token: 'tok_access',
  refresh_token: 'tok_refresh',
  user: { id: 1, email: 'a@b.com', full_name: 'A B' },
};

function setDemoMode(val: boolean) {
  Object.defineProperty(demo, 'DEMO_MODE', { value: val, configurable: true });
}

// ── demo mode ────────────────────────────────────────────────────────────────

describe('authApi — demo mode', () => {
  beforeEach(() => { setDemoMode(true); jest.clearAllMocks(); });

  it('login resolves with DEMO_AUTH without hitting network', async () => {
    const res = await authApi.login({ email: 'x@y.com', password: 'password1' });
    expect(res).toHaveProperty('access_token');
    expect(res).toHaveProperty('user');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('register resolves with DEMO_AUTH without hitting network', async () => {
    const res = await authApi.register({ email: 'x@y.com', password: 'password1' });
    expect(res).toHaveProperty('access_token');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('checkEmailAvailability resolves { available: true }', async () => {
    const res = await authApi.checkEmailAvailability('x@y.com');
    expect(res.available).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('refresh resolves with access_token', async () => {
    const res = await authApi.refresh('demo-refresh-token');
    expect(res.access_token).toBe('demo-access-token');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('me resolves with DEMO_USER', async () => {
    const user = await authApi.me();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('logout resolves void', async () => {
    await expect(authApi.logout()).resolves.toBeUndefined();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('changePassword resolves after ~600ms', async () => {
    jest.useFakeTimers();
    const p = authApi.changePassword('old', 'new');
    jest.advanceTimersByTime(700);
    await expect(p).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});

// ── real mode ────────────────────────────────────────────────────────────────

describe('authApi — real mode', () => {
  beforeEach(() => { setDemoMode(false); jest.clearAllMocks(); });

  it('login POSTs to /api/auth/login with skipAuth', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_AUTH_RESP);
    const res = await authApi.login({ email: 'a@b.com', password: 'pass1234' });
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      skipAuth: true,
    }));
    expect(res.access_token).toBe('tok_access');
  });

  it('register POSTs to /api/auth/register with skipAuth', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_AUTH_RESP);
    await authApi.register({ email: 'a@b.com', password: 'pass1234' });
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST',
      skipAuth: true,
    }));
  });

  it('checkEmailAvailability POSTs to /api/auth/email-availability', async () => {
    mockRequest.mockResolvedValueOnce({ available: false });
    const res = await authApi.checkEmailAvailability('taken@b.com');
    expect(res.available).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/email-availability', expect.objectContaining({ method: 'POST' }));
  });

  it('refresh POSTs to /api/auth/refresh', async () => {
    mockRequest.mockResolvedValueOnce({ access_token: 'new_tok' });
    const res = await authApi.refresh('rt');
    expect(res.access_token).toBe('new_tok');
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/refresh', expect.objectContaining({ method: 'POST' }));
  });

  it('me GETs /api/auth/me', async () => {
    mockRequest.mockResolvedValueOnce({ id: 1, email: 'a@b.com', full_name: null });
    const user = await authApi.me();
    expect(user.id).toBe(1);
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/me');
  });

  it('logout POSTs to /api/auth/logout', async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await authApi.logout();
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('changePassword POSTs to /api/auth/change-password', async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await authApi.changePassword('old', 'new123');
    expect(mockRequest).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({ method: 'POST' }));
  });

  it('propagates ApiError from network layer', async () => {
    mockRequest.mockRejectedValueOnce(new client.ApiError(400, 'Bad request'));
    await expect(authApi.login({ email: 'x', password: 'y' })).rejects.toBeInstanceOf(client.ApiError);
  });

  it('propagates UnauthorizedError on 401', async () => {
    mockRequest.mockRejectedValueOnce(new client.UnauthorizedError());
    await expect(authApi.me()).rejects.toBeInstanceOf(client.UnauthorizedError);
  });
});
