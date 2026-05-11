/**
 * Receipt capture screen — lets users pick from gallery or take a photo,
 * then uploads to the server and polls for OCR status.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';
import { receiptsApi } from '../../src/api/receipts';
import { ApiError } from '../../src/api/client';

type State = 'idle' | 'uploading' | 'success' | 'error';

export default function CaptureScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
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
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
    });
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
      setTimeout(() => {
        router.push(`/receipt/${response.receipt_id}`);
      }, 800);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Receipt</Text>
      </View>

      <View style={styles.body}>
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={takePhoto} disabled={state === 'uploading'}>
            <Text style={styles.outlineBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={pickFromGallery} disabled={state === 'uploading'}>
            <Text style={styles.outlineBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri && state !== 'success' && (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, state === 'uploading' && styles.disabled]}
            onPress={upload}
            disabled={state === 'uploading'}
          >
            {state === 'uploading'
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.primaryBtnText}>Upload receipt</Text>
            }
          </TouchableOpacity>
        )}

        {state === 'success' && (
          <View style={styles.successMsg}>
            <Text style={styles.successText}>Uploaded! OCR is processing…</Text>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.errorMsg}>
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
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'], paddingBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
  previewWrap: {
    height: 320,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  preview: { width: '100%', height: '100%' },
  placeholder: {
    height: 320,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: { color: colors.text3, fontSize: 14 },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  outlineBtn: { borderWidth: 1.5, borderColor: colors.primary },
  outlineBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  primaryBtn: { backgroundColor: colors.primary },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  successMsg: { alignItems: 'center', padding: spacing.lg, backgroundColor: '#DCFCE7', borderRadius: radius.md },
  successText: { color: colors.success, fontWeight: '600' },
  errorMsg: { alignItems: 'center', padding: spacing.lg, backgroundColor: '#FEE2E2', borderRadius: radius.md, gap: spacing.sm },
  errorText: { color: colors.error, fontSize: 13 },
  retryBtn: { backgroundColor: colors.error, borderRadius: radius.sm, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.xl },
  retryText: { color: colors.white, fontWeight: '600', fontSize: 13 },
});
