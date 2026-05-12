import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../../src/api/receipts';
import { ApiError } from '../../src/api/client';
import { Button } from '../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../src/theme/tokens';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function CaptureScreen() {
  const [imageUri,  setImageUri]  = useState<string | null>(null);
  const [state,     setState]     = useState<UploadState>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const queryClient  = useQueryClient();

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setState('idle');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setState('idle');
    }
  };

  const upload = async () => {
    if (!imageUri) return;
    setState('uploading');
    setErrorMsg('');
    try {
      const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const response = await receiptsApi.upload(imageUri, mimeType);
      await queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setState('success');
      setTimeout(() => router.push(`/receipt/${response.receipt_id}`), 800);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Upload failed. Please try again.';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const reset = () => {
    setImageUri(null);
    setState('idle');
    setErrorMsg('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan Receipt</Text>
        <Text style={styles.subtitle}>Camera or gallery — we'll extract the data</Text>
      </View>

      <View style={styles.body}>
        {/* Preview / placeholder */}
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            {state !== 'uploading' && state !== 'success' && (
              <TouchableOpacity style={styles.clearBtn} onPress={reset}>
                <Ionicons name="close-circle" size={28} color={colors.text1} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Ionicons name="receipt-outline" size={44} color={colors.text3} />
            </View>
            <Text style={styles.placeholderTitle}>No image selected</Text>
            <Text style={styles.placeholderSub}>Take a photo or choose from gallery</Text>
          </View>
        )}

        {/* Source buttons */}
        {state !== 'uploading' && state !== 'success' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.sourceBtn} onPress={takePhoto} activeOpacity={0.75}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={styles.sourceBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceBtn} onPress={pickFromGallery} activeOpacity={0.75}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={styles.sourceBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload CTA */}
        {imageUri && state === 'idle' && (
          <Button
            label="Upload receipt"
            onPress={upload}
            icon="cloud-upload-outline"
            fullWidth
            size="lg"
          />
        )}

        {/* Status cards */}
        {state === 'uploading' && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.statusText}>Uploading…</Text>
          </View>
        )}

        {state === 'success' && (
          <View style={[styles.statusCard, styles.successCard]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.successText}>Uploaded! Extracting data…</Text>
          </View>
        )}

        {state === 'error' && (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Ionicons name="alert-circle" size={28} color={colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity onPress={reset} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title:    { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.text2 },

  body: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },

  previewWrap: {
    height: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  preview: { width: '100%', height: '100%' },
  clearBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.bg + 'CC',
    borderRadius: radius.full,
  },

  placeholder: {
    height: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '600', color: colors.text2 },
  placeholderSub:   { fontSize: 12, color: colors.text3 },

  btnRow: { flexDirection: 'row', gap: spacing.md },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary + '88',
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.primaryLight,
  },
  sourceBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  statusCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successCard: { borderColor: colors.success + '44' },
  errorCard:   { borderColor: colors.error + '44' },
  statusText:  { color: colors.text2, fontSize: 14, fontWeight: '600' },
  successText: { color: colors.success, fontWeight: '600', fontSize: 14 },
  errorText:   { color: colors.error, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
