import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../app/auth/login';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../api/client';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../store/authStore');

const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
    login: mockLogin,
    register: jest.fn(),
    logout: jest.fn(),
    hydrate: jest.fn(),
    refreshToken: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe('LoginScreen', () => {
  it('renders email and password inputs and sign-in button', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('shows inline error when email is invalid', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeTruthy();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows inline error when password is too short', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), '123');
    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with valid credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'securepass');
    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'securepass');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/receipts');
    });
  });

  it('shows inline error on API error', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Invalid credentials'));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrongpass1');
    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
