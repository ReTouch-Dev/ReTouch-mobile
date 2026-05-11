import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../../app/auth/register';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../api/client';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  Link: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => children,
}));
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

const mockRegister = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as jest.MockedFunction<typeof useAuthStore>).mockReturnValue({
    login: jest.fn(),
    register: mockRegister,
    logout: jest.fn(),
    hydrate: jest.fn(),
    refreshToken: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

function getCreateAccountButton() {
  return screen.getAllByText('Create account')[1];
}

describe('RegisterScreen', () => {
  it('renders registration fields and button', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Jane Doe')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2);
    expect(screen.getAllByText('Create account')).toHaveLength(2);
    expect(getCreateAccountButton()).toBeTruthy();
  });

  it('shows inline error when passwords do not match', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[1], 'password456');
    fireEvent.press(getCreateAccountButton());

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeTruthy();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register and redirects on success', async () => {
    mockRegister.mockResolvedValue(undefined);
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Jane Doe'), 'Test User');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[1], 'password123');
    fireEvent.press(getCreateAccountButton());

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/receipts');
    });
  });

  it('shows a helpful inline error when the email already exists', async () => {
    mockRegister.mockRejectedValue(new ApiError(400, 'User with this email already exists'));
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[0], 'password123');
    fireEvent.changeText(screen.getAllByPlaceholderText('••••••••')[1], 'password123');
    fireEvent.press(getCreateAccountButton());

    await waitFor(() => {
      expect(
        screen.getByText('An account with this email already exists. Try signing in instead.'),
      ).toBeTruthy();
    });
  });
});
