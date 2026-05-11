import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ProfileScreen from '../../app/(tabs)/profile';
import { useAuthStore } from '../store/authStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Rect: () => null,
  Path: () => null,
}));
jest.mock('../store/authStore');

const mockLogout = jest.fn();

const MOCK_USER = { id: 1, email: 'test@example.com', full_name: 'Test User' };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
    login: jest.fn(),
    register: jest.fn(),
    logout: mockLogout,
    hydrate: jest.fn(),
    refreshToken: jest.fn(),
    user: MOCK_USER,
    isAuthenticated: true,
    isLoading: false,
  });
});

describe('ProfileScreen', () => {
  it('renders user display name and email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('renders avatar initial from full name', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('T')).toBeTruthy();
  });

  it('falls back to email initial when no full name', () => {
    (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      hydrate: jest.fn(),
      refreshToken: jest.fn(),
      user: { id: 2, email: 'alice@example.com', full_name: null },
      isAuthenticated: true,
      isLoading: false,
    });
    render(<ProfileScreen />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('shows sign-out confirmation when Sign out is pressed', async () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(screen.getByText('Sign out?')).toBeTruthy();
      expect(screen.getByText('You can sign back in at any time.')).toBeTruthy();
    });
  });

  it('dismisses confirmation when Cancel is pressed', async () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Sign out'));
    await waitFor(() => screen.getByText('Sign out?'));
    fireEvent.press(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Sign out?')).toBeNull();
    });
  });

  it('calls logout when confirmation Sign out is pressed', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Sign out'));
    await waitFor(() => screen.getByText('Sign out?'));

    const signOutBtns = screen.getAllByText('Sign out');
    // The second one is inside the confirmation sheet
    await act(() => fireEvent.press(signOutBtns[signOutBtns.length - 1]));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('renders version string', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('ReTouch v1.0.0')).toBeTruthy();
  });
});
