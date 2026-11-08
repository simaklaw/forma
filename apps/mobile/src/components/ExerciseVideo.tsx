/**
 * Technique hero: real video when URL given; otherwise animated step cues
 * (copyright-safe, no third-party clips). Optional poster from wger photo.
 *
 * issue #160: оверлей видео всегда тёмный (у роликов тёмный леттербоксинг),
 * поэтому текст на нём — фиксированные светлые цвета, а не theme-lime:
 * в светлой «фарфоровой» теме лесной акцент на тёмном оверлее нечитаем.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { fonts, radius, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  /** Remote { uri } or Metro require() asset number. */
  source?: { uri: string } | number;
  /** Vetted dataset GIF for the exact exercise (issue #175); Android animates GIF natively. */
  gifAsset?: number;
  /** Optional local poster bundled with a profile-specific animation. */
  posterAsset?: number;
  /** Optional still from wger when bundled media is missing. */
  posterUri?: string;
  /** Short technique steps (from plan note). */
  cues?: string[];
  label?: string;
  /** When false, pause preview playback (e.g. sheet closed). */
  shouldPlay?: boolean;
}

/** RN 0.85: RN убрал этот оверлей-хелпер — используем явный объект для спредов стилей. */
const absoluteFillObject = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

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
  posterAsset,
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
  const [readySourceKey, setReadySourceKey] = useState<string | null>(null);
  const [failedSourceKey, setFailedSourceKey] = useState<string | null>(null);
  const sourceIdentity =
    source == null ? '' : typeof source === 'number' ? `asset:${source}` : `uri:${source.uri}`;
  const videoReady = sourceIdentity !== '' && readySourceKey === sourceIdentity;
  const videoFailed = sourceIdentity !== '' && failedSourceKey === sourceIdentity;
  useEffect(() => {
    setFailedSourceKey(null);
  }, [sourceIdentity]);
  const posterSource =
    posterAsset != null ? posterAsset : posterUri ? { uri: posterUri } : undefined;
  // SDK 55: expo-av удалён из Expo — видео на expo-video (VideoPlayer + VideoView).
  const videoSource = source == null ? null : source;
  const previewPlayer = useVideoPlayer(videoSource, (player) => {
    player.muted = true;
    player.loop = true;
  });
  const fullscreenPlayer = useVideoPlayer(videoSource, (player) => {
    player.muted = false;
  });
  const { status: previewStatus, error: previewError } = useEvent(previewPlayer, 'statusChange', {
    status: previewPlayer.status
  });
  const { isPlaying: fullscreenPlaying } = useEvent(fullscreenPlayer, 'playingChange', {
    isPlaying: fullscreenPlayer.playing
  });

  // Готовность/ошибка источника: события VideoPlayer вместо колбэков expo-av.
  useEffect(() => {
    if (!sourceIdentity) return;
    if (previewError != null || previewStatus === 'error') {
      setReadySourceKey((ready) => (ready === sourceIdentity ? null : ready));
      setFailedSourceKey(sourceIdentity);
    } else if (previewStatus === 'readyToPlay') {
      setFailedSourceKey((failed) => (failed === sourceIdentity ? null : failed));
      setReadySourceKey(sourceIdentity);
    }
  }, [previewStatus, previewError, sourceIdentity]);

  // Превью играет, только пока шторка/экран видимы (shouldPlay).
  useEffect(() => {
    if (!source) return;
    if (shouldPlay) {
      previewPlayer.play();
    } else {
      previewPlayer.pause();
    }
  }, [shouldPlay, source, previewPlayer]);

  useEffect(() => {
    if (source || gifAsset != null || posterAsset != null || posterUri) return;
    setStepIdx(0);
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2800);
    return () => clearInterval(id);
  }, [source, gifAsset, posterAsset, posterUri, steps.length]);

  function openFullscreen() {
    // GIF и постер тоже открываются на весь экран — карточка не должна
    // выглядеть сломанным плеером там, где видео нет (issue #160).
    if (gifAsset != null || posterSource) {
      setFullscreen(true);
      return;
    }
    if (!source || videoFailed) return;
    previewPlayer.pause();
    setFullscreen(true);
  }

  function closeFullscreen() {
    fullscreenPlayer.pause();
    setFullscreen(false);
  }

  function toggleFullscreenPlayback() {
    if (fullscreenPlaying) {
      fullscreenPlayer.pause();
    } else {
      fullscreenPlayer.play();
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.hero}
        onPress={openFullscreen}
        disabled={!source && gifAsset == null && !posterSource}
        accessibilityRole="button"
        accessibilityLabel={
          source && !videoFailed
            ? 'Открыть видео техники на весь экран'
            : gifAsset != null
              ? 'Анимированная иллюстрация упражнения'
              : posterSource
                ? 'Видео недоступно; показан постер упражнения'
                : 'Пошаговая техника выполнения'
        }
      >
        {source && !videoFailed ? (
          <>
            <VideoView
              player={previewPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              surfaceType="textureView"
            />
            {posterSource && !videoReady ? (
              <Image
                source={posterSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
          </>
        ) : gifAsset != null ? (
          <Image
            source={gifAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : posterSource ? (
          <Image
            source={posterSource}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholderBg} />
        )}

        {/* Затемнение — только поверх реального видео; постеры показываем без него. */}
        {source != null && !videoFailed ? <View style={styles.dim} /> : null}

        {!source && gifAsset == null && !posterSource ? (
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
        ) : source != null && !videoFailed ? (
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶</Text>
          </View>
        ) : null}

        <Text style={styles.heroLabel}>
          {(source != null && !videoFailed) || gifAsset != null
            ? label
            : posterSource
              ? 'ИЛЛЮСТРАЦИЯ УПРАЖНЕНИЯ'
              : 'ТЕХНИКА · ПО ШАГАМ'}
        </Text>
      </TouchableOpacity>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={closeFullscreen}>
        <View style={styles.fullscreenRoot}>
          {source && !videoFailed ? (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={toggleFullscreenPlayback}
            >
              <VideoView
                player={fullscreenPlayer}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
                surfaceType="textureView"
              />
              {!fullscreenPlaying && (
                <View style={styles.pauseOverlay}>
                  <Text style={styles.pauseIcon}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : gifAsset != null ? (
            <Image
              source={gifAsset}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : posterSource ? (
            <Image
              source={posterSource}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
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
      ...absoluteFillObject,
      backgroundColor: colors.ink
    },
    dim: {
      ...absoluteFillObject,
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
      ...absoluteFillObject,
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

