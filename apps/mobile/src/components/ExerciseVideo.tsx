/**
 * Technique hero: real video when URL given; otherwise animated step cues
 * (copyright-safe, no third-party clips). Optional poster from wger photo.
 *
 * issue #160: оверлей видео всегда тёмный (у роликов тёмный леттербоксинг),
 * поэтому текст на нём — фиксированные светлые цвета, а не theme-lime:
 * в светлой «фарфоровой» теме лесной акцент на тёмном оверлее нечитаем.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { fonts, radius, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  /** Remote { uri } or Metro require() asset number. */
  source?: { uri: string } | number;
  /** Vetted animated asset for the exact exercise; Android animates GIF natively. */
  gifAsset?: number;
  /** Reviewed premium animation selected for the exact exercise and profile sex. */
  premiumGifAsset?: number;
  /** Bundled, exact local illustration. Preferred over network-dependent posters. */
  posterAsset?: number;
  /** Optional still from wger when no local poster is available. */
  posterUri?: string;
  /** Short technique steps (from plan note). */
  cues?: string[];
  label?: string;
  /** When false, pause preview playback (e.g. sheet closed). */
  shouldPlay?: boolean;
}

function normalizeCues(cues: string[] | undefined): string[] {
  if (!cues?.length) {
    return [
      'Исходное положение — стабильный корпус',
      'Контролируй амплитуду, без рывков',
      'Выдох на усилии, вдох на возврате'
    ];
  }
  return cues.map((c) => c.trim()).filter(Boolean).slice(0, 6);
}

export default function ExerciseVideo({
  source,
  gifAsset,
  premiumGifAsset,
  posterAsset,
  posterUri,
  cues,
  label = 'ТЕХНИКА ВЫПОЛНЕНИЯ',
  shouldPlay = true
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const steps = useMemo(() => normalizeCues(cues), [cues]);
  const [stepIdx, setStepIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewRef = useRef<Video>(null);
  const fullscreenRef = useRef<Video>(null);

  useEffect(() => {
    if (source || gifAsset != null || premiumGifAsset != null || posterAsset != null || posterUri) return;
    setStepIdx(0);
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2800);
    return () => clearInterval(id);
  }, [source, gifAsset, premiumGifAsset, posterAsset, posterUri, steps.length]);

  useEffect(() => {
    if (!source || premiumGifAsset != null || !previewRef.current) return;
    if (shouldPlay) {
      previewRef.current.playAsync().catch(() => {});
    } else {
      previewRef.current.pauseAsync().catch(() => {});
    }
  }, [shouldPlay, source, premiumGifAsset]);

  function openFullscreen() {
    if (premiumGifAsset != null || gifAsset != null || posterAsset != null || posterUri) {
      setFullscreen(true);
      return;
    }
    if (!source) return;
    previewRef.current?.pauseAsync().catch(() => {});
    setIsPlaying(true);
    setFullscreen(true);
  }

  function closeFullscreen() {
    fullscreenRef.current?.pauseAsync().catch(() => {});
    setFullscreen(false);
    setIsPlaying(false);
  }

  async function toggleFullscreenPlayback() {
    const status = (await fullscreenRef.current?.getStatusAsync()) as AVPlaybackStatus & {
      isPlaying?: boolean;
    };
    if (status?.isPlaying) {
      await fullscreenRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      await fullscreenRef.current?.playAsync();
      setIsPlaying(true);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.hero}
        onPress={openFullscreen}
        disabled={!source && gifAsset == null && premiumGifAsset == null && posterAsset == null && !posterUri}
        accessibilityRole="button"
        accessibilityLabel={
          source && premiumGifAsset == null
            ? 'Открыть видео техники на весь экран'
            : 'Анимированная иллюстрация упражнения'
        }
      >
        {premiumGifAsset != null ? (
          <Image
            source={premiumGifAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : source ? (
          <Video
            ref={previewRef}
            source={source as any}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isMuted
            isLooping
            shouldPlay={shouldPlay}
          />
        ) : gifAsset != null ? (
          <Image
            source={gifAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : posterAsset != null ? (
          <Image
            source={posterAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholderBg} />
        )}

        {source != null && premiumGifAsset == null && <View style={styles.dim} />}

        {!source && gifAsset == null && premiumGifAsset == null && posterAsset == null && !posterUri ? (
          <View style={styles.guide}>
            <Text style={styles.guideStep}>
              Шаг {stepIdx + 1}/{steps.length}
            </Text>
            <Text style={styles.guideText} numberOfLines={3}>
              {steps[stepIdx]}
            </Text>
            <View style={styles.dots}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === stepIdx && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        ) : source != null && premiumGifAsset == null ? (
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶</Text>
          </View>
        ) : null}

        <Text style={styles.heroLabel}>
          {source != null || gifAsset != null || premiumGifAsset != null
            ? label
            : posterAsset != null || posterUri
              ? 'ИЛЛЮСТРАЦИЯ УПРАЖНЕНИЯ'
              : 'ВИДЕО НЕТ · ТЕХНИКА ПО ШАГАМ'}
        </Text>
      </TouchableOpacity>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={closeFullscreen}>
        <View style={styles.fullscreenRoot}>
          {source && premiumGifAsset == null ? (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={toggleFullscreenPlayback}
            >
              <Video
                ref={fullscreenRef}
                source={source as any}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls={false}
                onPlaybackStatusUpdate={(status) => {
                  if ('isPlaying' in status) setIsPlaying(!!status.isPlaying);
                }}
              />
              {!isPlaying && (
                <View style={styles.pauseOverlay}>
                  <Text style={styles.pauseIcon}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : premiumGifAsset != null ? (
            <Image source={premiumGifAsset} style={styles.fullscreenMedia} resizeMode="contain" />
          ) : gifAsset != null ? (
            <Image source={gifAsset} style={styles.fullscreenMedia} resizeMode="contain" />
          ) : posterAsset != null ? (
            <Image source={posterAsset} style={styles.fullscreenMedia} resizeMode="contain" />
          ) : posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.fullscreenMedia} resizeMode="contain" />
          ) : null}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeFullscreen}
            accessibilityLabel="Закрыть видео"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    hero: {
      height: 286,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.panel,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      borderRadius: radius.control
    },
    placeholderBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.ink
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)'
    },
    guide: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 28,
      bottom: 36,
      justifyContent: 'center'
    },
    guideStep: {
      color: '#7DEBD0',
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 1,
      marginBottom: 8
    },
    guideText: {
      color: '#fff',
      fontFamily: fonts.bodySemi,
      fontSize: 16,
      lineHeight: 22
    },
    dots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.25)'
    },
    dotActive: { backgroundColor: '#7DEBD0', width: 16 },
    playBadge: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -26,
      marginTop: -26,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center'
    },
    playBadgeText: { color: '#fff', fontSize: 18 },
    heroLabel: {
      color: '#fff',
      fontSize: 11,
      fontFamily: fonts.bodySemi,
      letterSpacing: 1,
      padding: 12,
      backgroundColor: 'rgba(0,0,0,0.35)'
    },
    fullscreenRoot: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    fullscreenMedia: { width: '100%', height: '100%' },
    pauseOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center'
    },
    pauseIcon: { color: '#fff', fontSize: 56 },
    closeBtn: {
      position: 'absolute',
      top: 48,
      left: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center'
    },
    closeBtnText: { color: '#fff', fontSize: 20, lineHeight: 20 }
  });
}
