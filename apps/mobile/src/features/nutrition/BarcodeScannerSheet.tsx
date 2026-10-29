import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraView, type BarcodeScanningResult } from 'expo-camera';
import { fonts, radius, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { FOOD_BARCODE_TYPES, isFoodBarcode } from './barcodeFilter';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}

type CameraPermission = 'asking' | 'granted' | 'denied';

/**
 * Полноэкранный модальный сканер штрихкодов (expo-camera, SDK 51).
 * Наружу отдаёт только коды, прошедшие контракт API (8–14 цифр EAN/UPC):
 * QR-ссылки и не-продуктовые форматы молча игнорируются, сканер продолжает работать.
 * После удачного скана закрывается и передаёт код в onScanned.
 */
export default function BarcodeScannerSheet({ visible, onClose, onScanned }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const [permission, setPermission] = useState<CameraPermission>('asking');
  const [torch, setTorch] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      scannedRef.current = false;
      setTorch(false);
      return;
    }
    let cancelled = false;
    setPermission('asking');
    Camera.requestCameraPermissionsAsync()
      .then((res) => {
        if (!cancelled) setPermission(res.granted ? 'granted' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setPermission('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  function handleScan(result: BarcodeScanningResult) {
    if (scannedRef.current) return; // expo-camera стреляет событием несколько раз подряд
    const code = (result?.data ?? '').trim();
    if (!isFoodBarcode(code)) return;
    scannedRef.current = true;
    RestTimerEngine.hapticTabSwitch();
    onScanned(code);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('scanBarcode')}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {permission === 'granted' ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: [...FOOD_BARCODE_TYPES] }}
              onBarcodeScanned={handleScan}
            />
            <View style={styles.hintPill}>
              <Text style={styles.hintText}>{t('scanHint')}</Text>
            </View>
            <TouchableOpacity
              style={styles.torchBtn}
              onPress={() => setTorch((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={torch ? t('scanTorchOff') : t('scanTorchOn')}
            >
              <Text style={styles.torchText}>{torch ? t('scanTorchOff') : t('scanTorchOn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.messageBox}>
            {permission === 'denied' ? (
              <>
                <Text style={styles.messageTitle}>{t('scanPermissionTitle')}</Text>
                <Text style={styles.messageBody}>{t('scanPermissionBody')}</Text>
                <TouchableOpacity
                  style={styles.settingsBtn}
                  onPress={() => Linking.openSettings().catch(() => {})}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanOpenSettings')}
                >
                  <Text style={styles.settingsBtnText}>{t('scanOpenSettings')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.messageBody}>{t('scanPermissionAsking')}</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ink },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    title: { color: colors.paper, fontFamily: fonts.mono, fontSize: 20 },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainer
    },
    closeText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 14 },
    cameraWrap: { flex: 1 },
    camera: { flex: 1 },
    hintPill: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 96,
      backgroundColor: colors.surfaceContainer,
      borderRadius: radius.control,
      padding: 12
    },
    hintText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 13, textAlign: 'center' },
    torchBtn: {
      position: 'absolute',
      right: 16,
      bottom: 24,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainerHigh
    },
    torchText: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 13 },
    messageBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    messageTitle: { color: colors.paper, fontFamily: fonts.mono, fontSize: 18, marginBottom: 8, textAlign: 'center' },
    messageBody: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 14, textAlign: 'center', marginBottom: 16 },
    settingsBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radius.control,
      backgroundColor: colors.lime
    },
    settingsBtnText: { color: colors.onAccent, fontFamily: fonts.bodySemi, fontSize: 14 }
  });
}
