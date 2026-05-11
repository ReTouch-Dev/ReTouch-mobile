import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaptureScreen from '../../app/(tabs)/capture';
import { receiptsApi } from '../api/receipts';
import { ApiError } from '../api/client';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-image-picker');
jest.mock('../api/receipts');

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockReceiptsApi = receiptsApi as jest.Mocked<typeof receiptsApi>;

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const PICKED_IMAGE = {
  canceled: false,
  assets: [{ uri: 'file:///tmp/receipt.jpg', width: 100, height: 100, type: 'image' as const, fileName: 'receipt.jpg', fileSize: 1000 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
    status: 'granted' as ImagePicker.PermissionStatus,
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
  mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
    status: 'granted' as ImagePicker.PermissionStatus,
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CaptureScreen', () => {
  it('renders title and action buttons', () => {
    render(<CaptureScreen />, { wrapper: makeWrapper() });
    expect(screen.getByText('Scan Receipt')).toBeTruthy();
    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('Gallery')).toBeTruthy();
  });

  it('shows placeholder before image is selected', () => {
    render(<CaptureScreen />, { wrapper: makeWrapper() });
    expect(screen.getByText('No image selected')).toBeTruthy();
  });

  it('shows Upload button after picking from gallery', async () => {
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue(PICKED_IMAGE);

    render(<CaptureScreen />, { wrapper: makeWrapper() });
    await act(() => fireEvent.press(screen.getByText('Gallery')));

    await waitFor(() => {
      expect(screen.getByText('Upload receipt')).toBeTruthy();
    });
  });

  it('shows Upload button after taking a photo', async () => {
    mockImagePicker.launchCameraAsync.mockResolvedValue(PICKED_IMAGE);

    render(<CaptureScreen />, { wrapper: makeWrapper() });
    await act(() => fireEvent.press(screen.getByText('Camera')));

    await waitFor(() => {
      expect(screen.getByText('Upload receipt')).toBeTruthy();
    });
  });

  it('shows success message after successful upload', async () => {
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue(PICKED_IMAGE);
    mockReceiptsApi.upload.mockResolvedValue({
      receipt_id: 'r-123',
      upload_status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
      mime_type: 'image/jpeg',
      image_url: null,
    });

    render(<CaptureScreen />, { wrapper: makeWrapper() });
    await act(() => fireEvent.press(screen.getByText('Gallery')));
    await waitFor(() => screen.getByText('Upload receipt'));
    await act(() => fireEvent.press(screen.getByText('Upload receipt')));

    await waitFor(() => {
      expect(screen.getByText('Uploaded! OCR is processing…')).toBeTruthy();
    });
  });

  it('shows error message on upload failure', async () => {
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue(PICKED_IMAGE);
    mockReceiptsApi.upload.mockRejectedValue(new ApiError(500, 'Server error'));

    render(<CaptureScreen />, { wrapper: makeWrapper() });
    await act(() => fireEvent.press(screen.getByText('Gallery')));
    await waitFor(() => screen.getByText('Upload receipt'));
    await act(() => fireEvent.press(screen.getByText('Upload receipt')));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeTruthy();
    });
  });

  it('resets to idle state when Try again is pressed', async () => {
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue(PICKED_IMAGE);
    mockReceiptsApi.upload.mockRejectedValue(new ApiError(500, 'Server error'));

    render(<CaptureScreen />, { wrapper: makeWrapper() });
    await act(() => fireEvent.press(screen.getByText('Gallery')));
    await waitFor(() => screen.getByText('Upload receipt'));
    await act(() => fireEvent.press(screen.getByText('Upload receipt')));
    await waitFor(() => screen.getByText('Try again'));

    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => {
      expect(screen.getByText('No image selected')).toBeTruthy();
    });
  });
});
