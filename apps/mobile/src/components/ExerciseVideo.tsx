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
  /** Vetted dataset GIF for the exact exercise (issue #175); Android animates GIF natively. */
  gifAsset?: number;
  /** Optional still from wger when video is missing. */
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
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const showVideo = source != null && !videoFailed;
  const previewRef = useRef<Video>(null);
  const fullscreenRef = useRef<Video>(null);

  useEffect(() => {
    if (source || gifAsset != null) return;
    setStepIdx(0);
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2800);
    return () => clearInterval(id);
  }, [source, gifAsset, steps.length]);

  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
  }, [source]);

  useEffect(() => {
    if (!showVideo || !previewRef.current) return;
    if (shouldPlay) {
      previewRef.current.playAsync().catch(() => {});
    } else {
      previewRef.current.pauseAsync().catch(() => {});
    }
  }, [shouldPlay, showVideo, source]);

  function openFullscreen() {
    if (!showVideo || !videoReady) return;
    previewRef.current?.pauseAsync().catch(() => {});
    setFullscreen(true);
  }

  function closeFullscreen() {
    fullscreenRef.current?.pauseAsync().catch(() => {});
    setFullscreen(false);
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
        disabled={!showVideo}
        accessibilityRole="button"
        accessibilityLabel={
          showVideo
            ? 'Открыть видео техники на весь экран'
            : 'Пошаговая техника выполнения'
        }
      >
        {showVideo && !videoReady && posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        {showVideo && !videoReady && !posterUri ? <View style={styles.placeholderBg} /> : null}
        {showVideo ? (
          <Video
            ref={previewRef}
            source={source as any}
            style={[StyleSheet.absoluteFill, { opacity: videoReady ? 1 : 0 }]}
            resizeMode={ResizeMode.COVER}
            isMuted
            isLooping
            shouldPlay={shouldPlay}
            onReadyForDisplay={() => setVideoReady(true)}
            onError={() => {
              setVideoFailed(true);
              setVideoReady(false);
            }}
          />
        ) : gifAsset != null ? (
          <Image
            source={gifAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholderBg} />
        )}

        <View style={styles.dim} />

        {!showVideo && gifAsset == null ? (
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
        ) : showVideo ? (
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶</Text>
          </View>
        ) : null}

        <Text style={styles.heroLabel}>
          {showVideo || gifAsset != null ? label : 'ТЕХНИКА · ПО ШАГАМ'}
        </Text>
      </TouchableOpacity>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={closeFullscreen}>
        <View style={styles.fullscreenRoot}>
          {showVideo && (
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
                useNativeControls={false}
                onError={() => {
                  setVideoFailed(true);
                  setFullscreen(false);
                }}
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
          )}
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
      height: 180,
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
    fullscreenRoot: { flex: 1, backgroundColor: '#000' },
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
