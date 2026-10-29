import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { fonts, radius, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { chatCompletion, visionUserContent } from '@/features/ai/openAiClient';
import { useAiAssistantStore } from '@/features/ai/useAiAssistantStore';
import { LABEL_SCAN_PROMPT, parseLabelAnswer, type LabelScanResult } from './labelScan';

interface Props {
  visible: boolean;
  onClose: () => void;
  onParsed: (result: LabelScanResult) => void;
}

type CameraPermission = 'asking' | 'granted' | 'denied';
type Stage = 'camera' | 'reading' | 'empty' | 'result';

/**
 * Полноэкранный модальный сканер этикетки продукта (expo-camera, SDK 51).
 * Фото таблицы БЖУ уходит в vision-модель BYOK-ассистента — как анализ фото
 * блюд, приватность та же. Модель обязана вернуть JSON на 100 г; значения
 * предзаполняют форму «Свой продукт» в AddFoodSheet (onParsed).
 */
export default function LabelScanSheet({ visible, onClose, onParsed }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const providers = useAiAssistantStore((s) => s.providers);
  const activeProviderId = useAiAssistantStore((s) => s.activeProviderId);
  const active = providers.find((p) => p.id === activeProviderId) ?? null;
  const aiReady = active != null && active.supportsVision;
  const [permission, setPermission] = useState<CameraPermission>('asking');
  const [torch, setTorch] = useState(false);
  const [stage, setStage] = useState<Stage>('camera');
  const [result, setResult] = useState<LabelScanResult | null>(null);
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);

  useEffect(() => {
    if (!visible) {
      setTorch(false);
      setStage('camera');
      setResult(null);
      return;
    }
    let cancelled = false;
    setPermission('asking');
    setStage('camera');
    setResult(null);
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

  async function captureLabel() {
    if (stage === 'reading' || !active || !active.supportsVision) return;
    setStage('reading');
    let tempUri: string | null = null;
    try {
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (!shot || !shot.uri) throw new Error('photo is empty');
      tempUri = shot.uri;
      const base64 = await FileSystem.readAsStringAsync(shot.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      const reply = await chatCompletion(active, [
        {
          role: 'user',
          content: visionUserContent(LABEL_SCAN_PROMPT, [{ base64, mimeType: 'image/jpeg' }])
        }
      ]);
      const parsed = parseLabelAnswer(reply.content);
      if (!parsed) {
        setStage('empty');
        return;
      }
      setResult(parsed);
      RestTimerEngine.hapticTabSwitch();
      setStage('result');
    } catch (e) {
      setStage('camera');
      Alert.alert(
        t('labelScanTitle'),
        t('aiTestFail', { message: e instanceof Error ? e.message.slice(0, 200) : String(e) })
      );
    } finally {
      if (tempUri) {
        void FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  function confirmResult() {
    if (!result) return;
    onParsed(result);
  }

  function retake() {
    setStage('camera');
    setResult(null);
  }

  const macroCell = (label: string, value: number, key: string) => (
    <View style={styles.macroCell} key={key}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('labelScanTitle')}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!aiReady ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageTitle}>{t('labelScanAiNeededTitle')}</Text>
            <Text style={styles.messageBody}>{t('labelScanAiNeededBody')}</Text>
          </View>
        ) : permission === 'denied' ? (
          <View style={styles.messageBox}>
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
          </View>
        ) : permission === 'granted' ? (
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} enableTorch={torch} />
            {stage === 'reading' ? (
              <View style={styles.hintCard}>
                <ActivityIndicator color={colors.lime} />
                <Text style={styles.readingText}>{t('labelScanReading')}</Text>
              </View>
            ) : stage === 'empty' ? (
              <View style={styles.hintCard}>
                <Text style={styles.emptyTitle}>{t('labelScanEmptyTitle')}</Text>
                <Text style={styles.emptyBody}>{t('labelScanEmptyBody')}</Text>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={retake}
                  accessibilityRole="button"
                  accessibilityLabel={t('labelScanRetake')}
                >
                  <Text style={styles.retakeBtnText}>{t('labelScanRetake')}</Text>
                </TouchableOpacity>
              </View>
            ) : stage === 'result' && result ? (
              <View style={styles.hintCard}>
                <Text style={styles.resultTitle}>{t('labelScanResultTitle')}</Text>
                <View style={styles.macroGrid}>
                  {macroCell(t('kcal'), Math.round(result.kcal), 'kcal')}
                  {macroCell(t('foodProtein'), result.protein, 'protein')}
                  {macroCell(t('foodFats'), result.fat, 'fat')}
                  {macroCell(t('foodCarbs'), result.carbs, 'carbs')}
                </View>
                <TouchableOpacity
                  style={styles.useBtn}
                  onPress={confirmResult}
                  accessibilityRole="button"
                  accessibilityLabel={t('labelScanUse')}
                >
                  <Text style={styles.useBtnText}>{t('labelScanUse')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={retake}
                  accessibilityRole="button"
                  accessibilityLabel={t('labelScanRetake')}
                >
                  <Text style={styles.retakeBtnText}>{t('labelScanRetake')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.hintPill}>
                <Text style={styles.hintText}>{t('labelScanHint')}</Text>
              </View>
            )}
            {stage === 'camera' ? (
              <>
                <TouchableOpacity
                  style={styles.shutterBtn}
                  onPress={() => {
                    void captureLabel();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('labelScanShutter')}
                >
                  <Text style={styles.shutterText}>{t('labelScanShutter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.torchBtn}
                  onPress={() => setTorch((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={torch ? t('scanTorchOff') : t('scanTorchOn')}
                >
                  <Text style={styles.torchText}>
                    {torch ? t('scanTorchOff') : t('scanTorchOn')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : (
          <View style={styles.messageBox}>
            <Text style={styles.messageBody}>{t('scanPermissionAsking')}</Text>
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
      bottom: 110,
      backgroundColor: colors.surfaceContainer,
      borderRadius: radius.control,
      padding: 12
    },
    hintText: {
      color: colors.paperDim,
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      textAlign: 'center'
    },
    hintCard: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 96,
      backgroundColor: colors.surfaceContainer,
      borderRadius: radius.control,
      padding: 16,
      gap: 8
    },
    readingText: {
      color: colors.paperDim,
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      textAlign: 'center'
    },
    emptyTitle: {
      color: colors.paper,
      fontFamily: fonts.mono,
      fontSize: 16,
      marginBottom: 2,
      textAlign: 'center'
    },
    emptyBody: {
      color: colors.paperDim,
      fontFamily: fonts.body,
      fontSize: 13,
      textAlign: 'center'
    },
    resultTitle: {
      color: colors.paperFaint,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: fonts.bodySemi,
      textAlign: 'center'
    },
    macroGrid: { flexDirection: 'row', gap: 8 },
    macroCell: {
      flex: 1,
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: radius.control,
      paddingVertical: 10,
      alignItems: 'center'
    },
    macroValue: { color: colors.lime, fontFamily: fonts.mono, fontSize: 17 },
    macroLabel: {
      color: colors.paperFaint,
      fontSize: 10,
      fontFamily: fonts.bodySemi,
      marginTop: 2
    },
    useBtn: {
      backgroundColor: colors.lime,
      borderRadius: radius.control,
      paddingVertical: 12,
      alignItems: 'center'
    },
    useBtnText: { color: colors.onAccent, fontFamily: fonts.bodySemi, fontSize: 14 },
    retakeBtn: {
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainer,
      paddingVertical: 10,
      alignItems: 'center'
    },
    retakeBtnText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 13 },
    shutterBtn: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      backgroundColor: colors.lime,
      borderRadius: radius.control,
      paddingVertical: 14,
      alignItems: 'center'
    },
    shutterText: { color: colors.onAccent, fontFamily: fonts.bodySemi, fontSize: 15 },
    torchBtn: {
      position: 'absolute',
      right: 16,
      top: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainerHigh
    },
    torchText: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 13 },
    messageBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    messageTitle: {
      color: colors.paper,
      fontFamily: fonts.mono,
      fontSize: 18,
      marginBottom: 8,
      textAlign: 'center'
    },
    messageBody: {
      color: colors.paperDim,
      fontFamily: fonts.body,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16
    },
    settingsBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radius.control,
      backgroundColor: colors.lime
    },
    settingsBtnText: { color: colors.onAccent, fontFamily: fonts.bodySemi, fontSize: 14 }
  });
}
