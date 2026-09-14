/**
 * ExerciseVideo.tsx
 *
 * Technique-demonstration video for an exercise. This fills a real gap that
 * neither the HTML prototype nor the first RN pass had: no video/technique
 * media at all, just a text note. The pattern (tappable hero preview →
 * fullscreen playback, tap-to-pause) is adapted from a Flutter reference
 * project the user shared — reimplemented here with expo-av's <Video>
 * instead of `video_player`, and restyled to the protocol/scoreboard
 * identity (square corners, bordered frame, mono labels) rather than that
 * reference's rounded gradient hero card.
 *
 * No real video URL is wired in yet — `source` is required and must be
 * supplied by the caller (e.g. a wger exercise's video/image field, once
 * WgerExerciseService is actually connected — see HANDOFF.md). Passing no
 * source renders a bordered placeholder instead of a broken player.
 */

import React, { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { colors, fonts } from '@/core/theme/tokens';

interface Props {
  source?: { uri: string };
  label?: string;
}

export default function ExerciseVideo({ source, label = 'ТЕХНИКА ВЫПОЛНЕНИЯ' }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewRef = useRef<Video>(null);
  const fullscreenRef = useRef<Video>(null);

  function openFullscreen() {
    if (!source) return;
    previewRef.current?.pauseAsync().catch(() => {});
    setFullscreen(true);
  }

  function closeFullscreen() {
    fullscreenRef.current?.pauseAsync().catch(() => {});
    setFullscreen(false);
  }

  async function toggleFullscreenPlayback() {
    const status = (await fullscreenRef.current?.getStatusAsync()) as AVPlaybackStatus & { isPlaying?: boolean };
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
        disabled={!source}
        accessibilityRole="button"
        accessibilityLabel="Открыть видео техники выполнения на весь экран"
      >
        {source ? (
          <Video
            ref={previewRef}
            source={source}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isMuted
            isLooping
            shouldPlay
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Видео техники не подключено</Text>
          </View>
        )}
        <View style={styles.playBadge}>
          <Text style={styles.playBadgeText}>{source ? '▶' : '—'}</Text>
        </View>
        <Text style={styles.heroLabel}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={closeFullscreen}>
        <View style={styles.fullscreenRoot}>
          {source && (
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={toggleFullscreenPlayback}>
              <Video
                ref={fullscreenRef}
                source={source}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
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
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={closeFullscreen} accessibilityLabel="Закрыть видео" accessibilityRole="button">
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 170,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.paperFaint, fontSize: 12 },
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
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
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
